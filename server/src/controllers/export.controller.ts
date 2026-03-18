import { Request, Response } from 'express'
import JSZip from 'jszip'
import { ExportService } from '../services/export.service.js'

export class ExportController {
  /**
   * Export project annotations as a ZIP containing COCO JSON split files.
   * POST /projects/:id/export/coco
   * Body: { trainRatio: 0.7, valRatio: 0.2, testRatio: 0.1 }
   */
  static async exportCOCO(req: Request, res: Response) {
    try {
      const id = req.params.id as string
      const trainRatio = parseFloat(req.body.trainRatio ?? '0.7')
      const valRatio = parseFloat(req.body.valRatio ?? '0.2')
      const testRatio = parseFloat(req.body.testRatio ?? '0.1')

      const result = await ExportService.exportCOCOSplit(
        id,
        trainRatio,
        valRatio,
        testRatio,
      )

      // Build ZIP with 3 COCO JSON files
      const zip = new JSZip()
      const safeName = result.projectName
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')

      zip.file('train.json', JSON.stringify(result.train, null, 2))
      zip.file('val.json', JSON.stringify(result.val, null, 2))
      zip.file('test.json', JSON.stringify(result.test, null, 2))

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
      const filename = `Export_${safeName}-coco.zip`

      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('X-Export-Stats', JSON.stringify(result.stats))
      return res.send(zipBuffer)
    } catch (error: any) {
      console.error('[Export] COCO export error:', error)

      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' })
      }
      if (error.message === 'Split ratios must sum to 1') {
        return res.status(400).json({ error: error.message })
      }

      return res.status(500).json({ error: 'Failed to export project' })
    }
  }
}
