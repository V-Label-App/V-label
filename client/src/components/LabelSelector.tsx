import { useState } from 'react';
import { Label as UILabel } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import type { Label, LabelCategory } from '../types/label.types';
import { Tag, Search, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface LabelSelectorProps {
  availableLabels: Label[];
  categories: LabelCategory[];
  selectedLabelIds: string[];
  onSelectionChange: (labelIds: string[]) => void;
  error?: string;
}

export function LabelSelector({
  availableLabels,
  categories,
  selectedLabelIds,
  onSelectionChange,
  error,
}: LabelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

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
    const matchesCategory = filterCategory === 'all' || label.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const labelsByCategory = categories.reduce((acc, category) => {
    const labelsInCategory = filteredLabels.filter(l => l.category === category.id);
    if (labelsInCategory.length > 0) {
      acc[category.id] = labelsInCategory;
    }
    return acc;
  }, {} as Record<string, Label[]>);

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onSelectionChange(selectedLabelIds.filter(id => id !== labelId));
    } else {
      onSelectionChange([...selectedLabelIds, labelId]);
    }
  };

  const selectAllInCategory = (categoryId: string) => {
    const labelsInCategory = filteredLabels.filter(l => l.category === categoryId);
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

  if (availableLabels.length === 0) {
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
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              const category = getCategoryById(categoryId);
              if (!category) return null;

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
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-sm">{category.name}</span>
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
            <p className="text-sm">No labels found</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        <Info className="w-3 h-3 inline mr-1" />
        Annotators will only be able to use these selected labels for this project
      </p>
    </div>
  );
}
