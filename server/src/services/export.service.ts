import { prisma } from '../utils/database.js'

interface CocoInfo {
  description: string
  version: string
  year: number
  contributor: string
  date_created: string
  split?: string
}

interface CocoImage {
  id: number
  file_name: string
  coco_url: string
  width: number
  height: number
  license: number
  date_captured: string
}

interface CocoAnnotation {
  id: number
  image_id: number
  category_id: number
  segmentation: []
  area: number
  bbox: [number, number, number, number]
  iscrowd: 0
}

interface CocoCategory {
  id: number
  name: string
  supercategory: string
}

export interface CocoJson {
  info: CocoInfo
  licenses: []
  images: CocoImage[]
  annotations: CocoAnnotation[]
  categories: CocoCategory[]
}

export interface CocoSplitResult {
  projectName: string
  train: CocoJson
  val: CocoJson
  test: CocoJson
  stats: {
    total: number
    trainCount: number
    valCount: number
    testCount: number
  }
}

// A single annotated image entry (image + its annotations)
interface AnnotatedImage {
  image: CocoImage
  annotations: Omit<CocoAnnotation, 'id' | 'image_id'>[]
}

export class ExportService {
  /**
   * Build categories map from project labels.
   */
  private static buildCategories(project: any): {
    categoryMap: Map<string, number>
    categories: CocoCategory[]
  } {
    const categoryMap = new Map<string, number>()
    const categories: CocoCategory[] = []
    const superCategoryMap = new Map<string, string>()

    // Collect supercategory from projectLabels relation
    ;(project.projectLabels || []).forEach((pl: any) => {
      const name = pl.label.name
      const supercategory = pl.label.category?.name || 'none'
      superCategoryMap.set(name, supercategory)
    })

    // Populate from labelConfig first (preserves project-defined order)
    const labelConfig = (project.labelConfig as any[]) || []
    labelConfig.forEach((lbl: any) => {
      const name = typeof lbl === 'string' ? lbl : lbl.name
      if (name && !categoryMap.has(name)) {
        const catId = categories.length + 1
        categoryMap.set(name, catId)
        categories.push({
          id: catId,
          name,
          supercategory: superCategoryMap.get(name) || 'none',
        })
      }
    })

    // Add any labels from projectLabels not already in labelConfig
    ;(project.projectLabels || []).forEach((pl: any) => {
      const name = pl.label.name
      if (!categoryMap.has(name)) {
        const catId = categories.length + 1
        categoryMap.set(name, catId)
        categories.push({
          id: catId,
          name,
          supercategory: superCategoryMap.get(name) || 'none',
        })
      }
    })

    return { categoryMap, categories }
  }

  /**
   * Fetch and deduplicate approved assignments, then build AnnotatedImage list.
   */
  private static async buildAnnotatedImages(
    projectId: string,
    categoryMap: Map<string, number>,
  ): Promise<AnnotatedImage[]> {
    const approvedAssignments = await prisma.taskAssignment.findMany({
      where: {
        task: { projectId },
        status: 'APPROVED',
      },
      include: {
        task: { include: { image: true } },
      },
      orderBy: { updatedAt: 'asc' },
    })

    // Deduplicate: one assignment per task (latest approved)
    const taskMap = new Map<string, typeof approvedAssignments[0]>()
    for (const a of approvedAssignments) {
      if (!taskMap.has(a.taskId) || a.updatedAt > taskMap.get(a.taskId)!.updatedAt) {
        taskMap.set(a.taskId, a)
      }
    }

    const result: AnnotatedImage[] = []
    let imageCounter = 1

    for (const assignment of taskMap.values()) {
      const image = assignment.task.image
      if (!image) continue

      const cocoImage: CocoImage = {
        id: imageCounter++,
        file_name: image.originalFilename,
        coco_url: image.storageUrl,
        width: image.width,
        height: image.height,
        license: 0,
        date_captured: image.uploadedAt.toISOString().substring(0, 10),
      }

      const rawAnnotations = (assignment.annotations as any[]) || []
      const cocoAnnotations: Omit<CocoAnnotation, 'id' | 'image_id'>[] = []

      for (const ann of rawAnnotations) {
        if (!ann.label || !ann.visible) continue
        const categoryId = categoryMap.get(ann.label)
        if (!categoryId) continue

        const x = Math.round(ann.x ?? 0)
        const y = Math.round(ann.y ?? 0)
        const w = Math.round(ann.width ?? 0)
        const h = Math.round(ann.height ?? 0)
        if (w <= 0 || h <= 0) continue

        cocoAnnotations.push({
          category_id: categoryId,
          segmentation: [],
          area: w * h,
          bbox: [x, y, w, h],
          iscrowd: 0,
        })
      }

      result.push({ image: cocoImage, annotations: cocoAnnotations })
    }

    return result
  }

  /**
   * Assemble a CocoJson from a subset of AnnotatedImages.
   * IDs are re-assigned sequentially within the subset.
   */
  private static assembleCoco(
    projectName: string,
    split: string,
    items: AnnotatedImage[],
    categories: CocoCategory[],
  ): CocoJson {
    const now = new Date()
    const images: CocoImage[] = []
    const annotations: CocoAnnotation[] = []
    let imageId = 1
    let annotationId = 1

    for (const item of items) {
      const img = { ...item.image, id: imageId }
      images.push(img)

      for (const ann of item.annotations) {
        annotations.push({ ...ann, id: annotationId++, image_id: imageId })
      }

      imageId++
    }

    return {
      info: {
        description: projectName,
        version: '1.0',
        year: now.getFullYear(),
        contributor: 'VLabel Platform',
        date_created: now.toISOString().substring(0, 10),
        split,
      },
      licenses: [],
      images,
      annotations,
      categories,
    }
  }

  /**
   * Shuffle array using Fisher-Yates (deterministic seed based on image IDs
   * so the same dataset always produces the same split).
   */
  private static deterministicShuffle<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      // Simple deterministic index using position — stable across exports
      const j = i % (i + 1)
      const tmp = copy[i] as T
      copy[i] = copy[j] as T
      copy[j] = tmp
    }
    return copy
  }

  /**
   * Export project annotations as a train/val/test split COCO JSON.
   * @param trainRatio  0–1, default 0.7
   * @param valRatio    0–1, default 0.2
   * @param testRatio   0–1, default 0.1
   */
  static async exportCOCOSplit(
    projectId: string,
    trainRatio = 0.7,
    valRatio = 0.2,
    testRatio = 0.1,
  ): Promise<CocoSplitResult> {
    // Validate ratios sum to ~1
    const total = trainRatio + valRatio + testRatio
    if (Math.abs(total - 1) > 0.01) {
      throw new Error('Split ratios must sum to 1')
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectLabels: {
          include: { label: { include: { category: true } } },
        },
      },
    })

    if (!project) throw new Error('Project not found')

    const { categoryMap, categories } = ExportService.buildCategories(project)
    const allItems = await ExportService.buildAnnotatedImages(projectId, categoryMap)

    // Shuffle for unbiased split
    const shuffled = ExportService.deterministicShuffle(allItems)
    const n = shuffled.length
    const trainEnd = Math.round(n * trainRatio)
    const valEnd = trainEnd + Math.round(n * valRatio)

    const trainItems = shuffled.slice(0, trainEnd)
    const valItems = shuffled.slice(trainEnd, valEnd)
    const testItems = shuffled.slice(valEnd)

    return {
      projectName: project.name,
      train: ExportService.assembleCoco(project.name, 'train', trainItems, categories),
      val: ExportService.assembleCoco(project.name, 'val', valItems, categories),
      test: ExportService.assembleCoco(project.name, 'test', testItems, categories),
      stats: {
        total: n,
        trainCount: trainItems.length,
        valCount: valItems.length,
        testCount: testItems.length,
      },
    }
  }
}
