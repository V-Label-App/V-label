import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import {
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { labelRequestApi, labelCategoryApi, type LabelRequest, type LabelCategory } from '../services/label.api';

interface LabelRequestsTabProps {
  projectId: string;
  onRequestProcessed?: () => void;
}

export function LabelRequestsTab({ projectId, onRequestProcessed }: LabelRequestsTabProps) {
  const [requests, setRequests] = useState<LabelRequest[]>([]);
  const [categories, setCategories] = useState<LabelCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');

  // Approve dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LabelRequest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requestsData, categoriesData] = await Promise.all([
        labelRequestApi.getProjectRequests(
          projectId,
          filterStatus === 'ALL' ? undefined : (filterStatus as 'PENDING' | 'APPROVED' | 'REJECTED')
        ),
        labelCategoryApi.getAll(),
      ]);
      setRequests(requestsData);
      setCategories(categoriesData);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openApproveDialog = (request: LabelRequest) => {
    setSelectedRequest(request);
    setSelectedCategory('');
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (request: LabelRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      await labelRequestApi.approveRequest(
        projectId,
        selectedRequest.id,
        selectedCategory || undefined
      );
      toast.success(`Label "${selectedRequest.labelName}" approved and added to project`);
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      await fetchData();
      onRequestProcessed?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      await labelRequestApi.rejectRequest(
        projectId,
        selectedRequest.id,
        rejectReason || undefined
      );
      toast.success(`Label request "${selectedRequest.labelName}" rejected`);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      await fetchData();
      onRequestProcessed?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: LabelRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Label Requests</h3>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Requests</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            No label requests found for this project.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <Card key={request.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* Requester Avatar */}
                <Avatar className="w-10 h-10">
                  <AvatarImage src={request.requester?.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(request.requester?.fullName || null)}
                  </AvatarFallback>
                </Avatar>

                {/* Request Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border"
                      style={{ backgroundColor: request.suggestedColor || '#888' }}
                    />
                    <span className="font-medium">{request.labelName}</span>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="text-sm text-muted-foreground mb-2">
                    Requested by{' '}
                    <span className="font-medium">
                      {request.requester?.fullName || request.requester?.email || 'Unknown'}
                    </span>
                    {' · '}
                    {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>

                  {request.reason && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-gray-50 rounded-md p-2 mt-2">
                      <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{request.reason}</span>
                    </div>
                  )}

                  {request.reviewer && request.reviewedAt && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} by{' '}
                      {request.reviewer.fullName || request.reviewer.email}
                      {' on '}
                      {format(new Date(request.reviewedAt), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {request.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => openApproveDialog(request)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openRejectDialog(request)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Label Request</DialogTitle>
            <DialogDescription>
              The label "{selectedRequest?.labelName}" will be created and added to this project.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: selectedRequest.suggestedColor || '#888' }}
                />
                <div>
                  <p className="font-medium">{selectedRequest.labelName}</p>
                  <p className="text-sm text-muted-foreground">
                    Suggested color: {selectedRequest.suggestedColor || 'None'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select value={selectedCategory || '__none__'} onValueChange={(v) => setSelectedCategory(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign this label to a category for better organization.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Approve & Create Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Label Request</DialogTitle>
            <DialogDescription>
              The requester will be notified that their request was rejected.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: selectedRequest.suggestedColor || '#888' }}
                />
                <div>
                  <p className="font-medium">{selectedRequest.labelName}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested by {selectedRequest.requester?.fullName || selectedRequest.requester?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rejection Reason (Optional)</Label>
                <Textarea
                  placeholder="Explain why this request is being rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be included in the notification to the requester.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Reject Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
