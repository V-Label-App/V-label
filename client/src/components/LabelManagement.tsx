import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label as UILabel } from './ui/label';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Tag, Edit2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Label, LabelCategory } from '../types/label.types';

// Re-export types for backwards compatibility
export type { Label, LabelCategory };

interface LabelManagementProps {
  open: boolean;
  onClose: () => void;
  labels: Label[];
  categories: LabelCategory[];
  onLabelsChange: (labels: Label[]) => void;
  onCategoriesChange: (categories: LabelCategory[]) => void;
}

const DEFAULT_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function LabelManagement({
  open,
  onClose,
  labels,
  categories,
  onLabelsChange,
  onCategoriesChange,
}: LabelManagementProps) {
  const [view, setView] = useState<'labels' | 'categories'>('labels');

  // Label state
  const [isAddLabelOpen, setIsAddLabelOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState(DEFAULT_COLORS[0]);
  const [labelCategory, setLabelCategory] = useState('');
  const [labelDescription, setLabelDescription] = useState('');

  // Category state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LabelCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(DEFAULT_COLORS[0]);
  const [categoryDescription, setCategoryDescription] = useState('');

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter labels
  const filteredLabels = labels.filter(label => {
    const matchesSearch = label.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || label.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Create/Update Label
  const handleSaveLabel = () => {
    if (!labelName.trim()) {
      toast.error('Label name is required');
      return;
    }

    if (!labelCategory) {
      toast.error('Please select a category');
      return;
    }

    if (editingLabel) {
      // Update
      const updated = labels.map(l =>
        l.id === editingLabel.id
          ? { ...l, name: labelName, color: labelColor, category: labelCategory, description: labelDescription }
          : l
      );
      onLabelsChange(updated);
      toast.success('Label updated successfully');
    } else {
      // Create
      const newLabel: Label = {
        id: `label-${Date.now()}`,
        name: labelName,
        color: labelColor,
        category: labelCategory,
        description: labelDescription,
        createdAt: new Date().toISOString(),
      };
      onLabelsChange([...labels, newLabel]);
      toast.success('Label created successfully');
    }

    resetLabelForm();
  };

  const resetLabelForm = () => {
    setLabelName('');
    setLabelColor(DEFAULT_COLORS[0]);
    setLabelCategory('');
    setLabelDescription('');
    setEditingLabel(null);
    setIsAddLabelOpen(false);
  };

  const openEditLabel = (label: Label) => {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelColor(label.color);
    setLabelCategory(label.category);
    setLabelDescription(label.description || '');
    setIsAddLabelOpen(true);
  };

  const handleDeleteLabel = (labelId: string) => {
    if (confirm('Are you sure you want to delete this label?')) {
      onLabelsChange(labels.filter(l => l.id !== labelId));
      toast.success('Label deleted');
    }
  };

  // Create/Update Category
  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (editingCategory) {
      // Update
      const updated = categories.map(c =>
        c.id === editingCategory.id
          ? { ...c, name: categoryName, color: categoryColor, description: categoryDescription }
          : c
      );
      onCategoriesChange(updated);
      toast.success('Category updated successfully');
    } else {
      // Create
      const newCategory: LabelCategory = {
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        description: categoryDescription,
        color: categoryColor,
      };
      onCategoriesChange([...categories, newCategory]);
      toast.success('Category created successfully');
    }

    resetCategoryForm();
  };

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryColor(DEFAULT_COLORS[0]);
    setCategoryDescription('');
    setEditingCategory(null);
    setIsAddCategoryOpen(false);
  };

  const openEditCategory = (category: LabelCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setCategoryDescription(category.description);
    setIsAddCategoryOpen(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const labelsInCategory = labels.filter(l => l.category === categoryId);

    if (labelsInCategory.length > 0) {
      toast.error(`Cannot delete category with ${labelsInCategory.length} label(s). Delete labels first.`);
      return;
    }

    if (confirm('Are you sure you want to delete this category?')) {
      onCategoriesChange(categories.filter(c => c.id !== categoryId));
      toast.success('Category deleted');
    }
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const getLabelCountByCategory = (categoryId: string) => {
    return labels.filter(l => l.category === categoryId).length;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Label Management</DialogTitle>
            <DialogDescription>
              Create and manage label categories and labels for your annotation projects
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b pb-4">
            <Button
              variant={view === 'labels' ? 'default' : 'outline'}
              onClick={() => setView('labels')}
            >
              <Tag className="w-4 h-4 mr-2" />
              Labels ({labels.length})
            </Button>
            <Button
              variant={view === 'categories' ? 'default' : 'outline'}
              onClick={() => setView('categories')}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Categories ({categories.length})
            </Button>
          </div>

          {/* Labels View */}
          {view === 'labels' && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Toolbar */}
              <div className="flex gap-3">
                <Input
                  placeholder="Search labels..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setIsAddLabelOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Label
                </Button>
              </div>

              {/* Labels Grid */}
              <div className="flex-1 overflow-auto">
                {filteredLabels.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredLabels.map(label => {
                      const category = getCategoryById(label.category);

                      return (
                        <Card key={label.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: label.color }}
                                />
                                <h4 className="font-medium truncate">{label.name}</h4>
                              </div>

                              {category && (
                                <Badge
                                  variant="outline"
                                  className="mb-2"
                                  style={{ borderColor: category.color, color: category.color }}
                                >
                                  {category.name}
                                </Badge>
                              )}

                              {label.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {label.description}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditLabel(label)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLabel(label.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Tag className="w-12 h-12 mb-4 opacity-50" />
                    <p>No labels found</p>
                    {categories.length === 0 && (
                      <p className="text-sm mt-2">Create a category first</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categories View */}
          {view === 'categories' && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Toolbar */}
              <div className="flex justify-end">
                <Button onClick={() => setIsAddCategoryOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Category
                </Button>
              </div>

              {/* Categories Grid */}
              <div className="flex-1 overflow-auto">
                {categories.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map(category => {
                      const labelCount = getLabelCountByCategory(category.id);

                      return (
                        <Card key={category.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: category.color }}
                                />
                                <h4 className="font-medium truncate">{category.name}</h4>
                              </div>

                              <p className="text-sm text-muted-foreground mb-2">
                                {category.description}
                              </p>

                              <Badge variant="secondary">
                                {labelCount} label{labelCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>

                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditCategory(category)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
                    <p>No categories yet</p>
                    <p className="text-sm mt-2">Create your first category to organize labels</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Label Dialog */}
      <Dialog open={isAddLabelOpen} onOpenChange={(open) => !open && resetLabelForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLabel ? 'Edit Label' : 'Create New Label'}</DialogTitle>
            <DialogDescription>
              {editingLabel ? 'Update label information' : 'Add a new label for annotation'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <UILabel>Label Name *</UILabel>
              <Input
                placeholder="e.g. Person, Car, Dog"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <UILabel>Category *</UILabel>
              <Select value={labelCategory} onValueChange={setLabelCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No categories available. Create a category first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <UILabel>Color *</UILabel>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-md border-2 transition-all ${labelColor === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setLabelColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <UILabel>Description (Optional)</UILabel>
              <Textarea
                placeholder="Brief description of this label..."
                value={labelDescription}
                onChange={(e) => setLabelDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetLabelForm}>
              Cancel
            </Button>
            <Button onClick={handleSaveLabel} disabled={categories.length === 0}>
              {editingLabel ? 'Update' : 'Create'} Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={(open) => !open && resetCategoryForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category information' : 'Add a new category to organize labels'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <UILabel>Category Name *</UILabel>
              <Input
                placeholder="e.g. Medical, Animals, Vehicles"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <UILabel>Description *</UILabel>
              <Textarea
                placeholder="What types of labels belong to this category?"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <UILabel>Color *</UILabel>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-md border-2 transition-all ${categoryColor === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCategoryColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetCategoryForm}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
