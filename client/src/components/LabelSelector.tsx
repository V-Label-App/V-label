import { useState, useEffect, useCallback } from 'react';
import { Label as UILabel } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { labelApi, labelCategoryApi, type Label, type LabelCategory } from '../services/label.api';
import { Tag, Search, Info, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

interface LabelSelectorProps {
  projectId?: string;
  selectedLabelIds: string[];
  onSelectionChange: (labelIds: string[]) => void;
  error?: string;
  allowCreateLabel?: boolean; // Allow creating project-specific labels
}

// Color palette for label creation
const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500',
];

export function LabelSelector({
  projectId: _projectId,
  selectedLabelIds,
  onSelectionChange,
  error,
  allowCreateLabel = true,
}: LabelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [categories, setCategories] = useState<LabelCategory[]>([]);

  // Create Label Dialog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(COLOR_PALETTE[0]);
  const [newLabelCategoryId, setNewLabelCategoryId] = useState<string>('__none__');
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCategoryLocked, setIsCategoryLocked] = useState(false); // Lock category when creating from inside a category

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [labelsData, categoriesData] = await Promise.all([
        labelApi.getAll(), // Get all labels (global + project-specific)
        labelCategoryApi.getAll(),
      ]);
      setAvailableLabels(labelsData);
      setCategories(categoriesData);
      // Auto-expand all categories
      setExpandedCategories(categoriesData.map(c => c.id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load labels');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Filter labels
  const filteredLabels = availableLabels.filter(label => {
    const matchesSearch = label.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || label.categoryId === filterCategory || (filterCategory === 'none' && !label.categoryId);
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const labelsByCategory = categories.reduce((acc, category) => {
    const labelsInCategory = filteredLabels.filter(l => l.categoryId === category.id);
    if (labelsInCategory.length > 0) {
      acc[category.id] = labelsInCategory;
    }
    return acc;
  }, {} as Record<string, Label[]>);

  // Also include labels without category
  const labelsWithoutCategory = filteredLabels.filter(l => !l.categoryId);
  if (labelsWithoutCategory.length > 0) {
    labelsByCategory['__uncategorized__'] = labelsWithoutCategory;
  }

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onSelectionChange(selectedLabelIds.filter(id => id !== labelId));
    } else {
      onSelectionChange([...selectedLabelIds, labelId]);
    }
  };

  const selectAllInCategory = (categoryId: string) => {
    const labelsInCategory = categoryId === '__uncategorized__'
      ? labelsWithoutCategory
      : filteredLabels.filter(l => l.categoryId === categoryId);
    const allSelected = labelsInCategory.every(l => selectedLabelIds.includes(l.id));

    if (allSelected) {
      // Deselect all
      const idsToRemove = labelsInCategory.map(l => l.id);
      onSelectionChange(selectedLabelIds.filter(id => !idsToRemove.includes(id)));
    } else {
      // Select all
      const idsToAdd = labelsInCategory.map(l => l.id);
      const newSelection = [...new Set([...selectedLabelIds, ...idsToAdd])];
      onSelectionChange(newSelection);
    }
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  // Reset create dialog state
  const resetCreateDialog = (categoryId?: string, lockCategory: boolean = false) => {
    setNewLabelName('');
    setNewLabelColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setNewLabelCategoryId(categoryId || '__none__');
    setIsCreatingNewCategory(false);
    setNewCategoryName('');
    setIsCategoryLocked(lockCategory);
  };

  // Open dialog with pre-selected and locked category
  const openCreateDialogForCategory = (categoryId: string) => {
    const catId = categoryId === '__uncategorized__' ? '__none__' : categoryId;
    resetCreateDialog(catId, true); // Lock category
    setIsCreateDialogOpen(true);
  };

  // Handle create label
  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Label name is required');
      return;
    }

    setIsCreating(true);
    try {
      let categoryId: string | undefined;

      // Create new category if needed
      if (isCreatingNewCategory && newCategoryName.trim()) {
        const newCategory = await labelCategoryApi.create({
          name: newCategoryName.trim(),
        });
        categoryId = newCategory.id;
        setCategories(prev => [...prev, newCategory]);
        setExpandedCategories(prev => [...prev, newCategory.id]);
      } else if (newLabelCategoryId !== '__none__') {
        categoryId = newLabelCategoryId;
      }

      // Create the label (project-specific, not global)
      const newLabel = await labelApi.create({
        name: newLabelName.trim(),
        color: newLabelColor,
        isGlobal: false, // Project-specific label
        categoryId,
      });

      // Add to available labels and auto-select it
      setAvailableLabels(prev => [...prev, newLabel]);
      onSelectionChange([...selectedLabelIds, newLabel.id]);

      toast.success(`Label "${newLabel.name}" created successfully`);
      setIsCreateDialogOpen(false);
      resetCreateDialog();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create label');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (availableLabels.length === 0 && !allowCreateLabel) {
    return (
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          No labels available. Create labels in Label Management first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <UILabel>Project Labels *</UILabel>
        <span className="text-sm text-muted-foreground">
          {selectedLabelIds.length} selected
        </span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search labels..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="none">No Category</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allowCreateLabel && (
          <Button
            variant="outline"
            onClick={() => {
              resetCreateDialog(undefined, false);
              setIsCreatingNewCategory(true);
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Category
          </Button>
        )}
      </div>

      {/* Selected Labels Summary */}
      {selectedLabelIds.length > 0 && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap gap-2">
            {selectedLabelIds.map(labelId => {
              const label = availableLabels.find(l => l.id === labelId);
              if (!label) return null;

              return (
                <Badge
                  key={labelId}
                  className="cursor-pointer"
                  style={{ backgroundColor: label.color, color: 'white' }}
                  onClick={() => toggleLabel(labelId)}
                >
                  {label.name}
                  <span className="ml-2">×</span>
                </Badge>
              );
            })}
          </div>
        </Card>
      )}

      {/* Labels by Category */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {Object.keys(labelsByCategory).length > 0 ? (
          <div className="divide-y">
            {Object.entries(labelsByCategory).map(([categoryId, labelsInCat]) => {
              const category = categoryId === '__uncategorized__' ? null : getCategoryById(categoryId);
              const categoryName = category ? category.name : 'Uncategorized';
              const allSelected = labelsInCat.every(l => selectedLabelIds.includes(l.id));
              const isExpanded = expandedCategories.includes(categoryId);

              return (
                <div key={categoryId} className="border-b last:border-0">
                  {/* Category Header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCategory(categoryId)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="font-medium text-sm">{categoryName}</span>
                      <Badge variant="secondary" className="text-xs ml-1">
                        {labelsInCat.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectAllInCategory(categoryId)}
                        className="text-xs h-7"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  </div>

                  {/* Labels in Category - Collapsible Content */}
                  {isExpanded && (
                    <div className="p-3 pt-0 bg-gray-50/30 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        {labelsInCat.map(label => {
                          const isSelected = selectedLabelIds.includes(label.id);

                          return (
                            <div
                              key={label.id}
                              className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all ${isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'hover:bg-white border-gray-200 bg-white'
                                }`}
                              onClick={() => toggleLabel(label.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleLabel(label.id)}
                              />
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: label.color }}
                                />
                                <span className="text-sm truncate">{label.name}</span>
                              </div>
                            </div>
                          );
                        })}
                        {/* Add Label Button inside category */}
                        {allowCreateLabel && (
                          <div
                            className="flex items-center justify-center gap-2 p-2 rounded-md border border-dashed border-gray-300 cursor-pointer transition-all hover:bg-white hover:border-blue-400 text-muted-foreground hover:text-blue-600"
                            onClick={() => openCreateDialogForCategory(categoryId)}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Add Label</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Tag className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm mb-3">No labels found</p>
            {allowCreateLabel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetCreateDialog();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create First Label
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        <Info className="w-3 h-3 inline mr-1" />
        Annotators will only be able to use these selected labels for this project
      </p>

      {/* Create Label Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Label Name */}
            <div className="space-y-2">
              <UILabel htmlFor="labelName">Label Name *</UILabel>
              <Input
                id="labelName"
                placeholder="Enter label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
              />
            </div>

            {/* Label Color */}
            <div className="space-y-2">
              <UILabel>Label Color *</UILabel>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newLabelColor === color
                        ? 'border-gray-900 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewLabelColor(color)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-12 h-8 p-0 border-0"
                />
                <Input
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  placeholder="#000000"
                  className="w-24 font-mono text-sm"
                />
                <div
                  className="flex-1 h-8 rounded border flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: newLabelColor }}
                >
                  Preview
                </div>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <UILabel>Category</UILabel>
              {isCategoryLocked ? (
                // Locked category - show read-only
                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md border">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {newLabelCategoryId === '__none__'
                      ? 'Uncategorized'
                      : categories.find(c => c.id === newLabelCategoryId)?.name || 'Unknown'}
                  </span>
                </div>
              ) : !isCreatingNewCategory ? (
                <div className="flex gap-2">
                  <Select
                    value={newLabelCategoryId}
                    onValueChange={(value) => {
                      if (value === '__new__') {
                        setIsCreatingNewCategory(true);
                        setNewLabelCategoryId('__none__');
                      } else {
                        setNewLabelCategoryId(value);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-blue-600">
                        <Plus className="w-3 h-3 inline mr-1" />
                        Create New Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNewCategory(false);
                      setNewCategoryName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              <Info className="w-3 h-3 inline mr-1" />
              This label will be created for this project only (not global)
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateLabel} disabled={isCreating || !newLabelName.trim()}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
