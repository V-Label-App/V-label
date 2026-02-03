import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import {
    Card,
    CardContent,
} from "../../../components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { labelRequestApi, labelCategoryApi } from "../../../services/label.api";
import type { LabelRequest, LabelCategory } from "../../../services/label.api";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";

interface LabelRequestManagerProps {
    projectId: string;
    onUpdatePendingCount?: (count: number) => void;
}

export function LabelRequestManager({ projectId, onUpdatePendingCount }: LabelRequestManagerProps) {
    const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
    const [requests, setRequests] = useState<LabelRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<LabelCategory[]>([]);

    // Action States
    const [selectedRequest, setSelectedRequest] = useState<LabelRequest | null>(null);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");
    const [rejectionReason, setRejectionReason] = useState("");

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await labelRequestApi.getProjectRequests(projectId, activeTab);
            setRequests(data);

            // Update pending count whenever we fetch pending requests, or if we just performed an action
            if (activeTab === "PENDING" && onUpdatePendingCount) {
                onUpdatePendingCount(data.length);
            } else if (onUpdatePendingCount) {
                // optimistically fetch pending count if we are on other tabs
                labelRequestApi.getPendingCount(projectId).then(onUpdatePendingCount);
            }
        } catch (error) {
            console.error("Failed to fetch label requests", error);
            toast.error("Failed to load requests");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await labelCategoryApi.getAll();
            setCategories(data);
        } catch (error) {
            console.error("Failed to fetch categories", error);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [projectId, activeTab]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleOpenApprove = (request: LabelRequest) => {
        setSelectedRequest(request);
        setSelectedCategoryId("none");
        setIsApproveOpen(true);
    };

    const handleOpenReject = (request: LabelRequest) => {
        setSelectedRequest(request);
        setRejectionReason("");
        setIsRejectOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;

        setActionLoading(true);
        try {
            await labelRequestApi.approveRequest(
                projectId,
                selectedRequest.id,
                selectedCategoryId === "none" ? undefined : selectedCategoryId
            );
            toast.success(`Label "${selectedRequest.labelName}" approved and created`);
            setIsApproveOpen(false);
            fetchRequests(); // Refresh list
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to approve request");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        setActionLoading(true);
        try {
            await labelRequestApi.rejectRequest(
                projectId,
                selectedRequest.id,
                rejectionReason
            );
            toast.success("Request rejected");
            setIsRejectOpen(false);
            fetchRequests(); // Refresh list
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to reject request");
        } finally {
            setActionLoading(false);
        }
    };


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Label Requests</h3>
                    <p className="text-sm text-muted-foreground">Manage label requests from annotators.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRequests} disabled={isLoading}>
                    Refresh
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList>
                    <TabsTrigger value="PENDING" className="relative">
                        Pending
                    </TabsTrigger>
                    <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                    <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <AlertCircle className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
                                    <p className="text-sm text-gray-500 max-w-sm mt-1">
                                        There are no {activeTab.toLowerCase()} label requests in this project.
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Label Name</TableHead>
                                            <TableHead>Requester</TableHead>
                                            <TableHead>Suggested Color</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Requested At</TableHead>
                                            {activeTab !== "PENDING" && <TableHead>Reviewed By</TableHead>}
                                            {activeTab === "PENDING" && <TableHead className="text-right">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium">{req.labelName}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarImage src={req.requester?.avatarUrl || undefined} />
                                                            <AvatarFallback className="text-[10px]">
                                                                {req.requester?.fullName?.charAt(0) || req.requester?.email.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{req.requester?.fullName || req.requester?.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {req.suggestedColor && (
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-4 h-4 rounded-full border border-gray-200"
                                                                style={{ backgroundColor: req.suggestedColor }}
                                                            />
                                                            <span className="text-xs text-muted-foreground">{req.suggestedColor}</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={req.reason || ""}>
                                                    {req.reason || "-"}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(req.createdAt), "MMM d, yyyy")}
                                                </TableCell>
                                                {activeTab !== "PENDING" && (
                                                    <TableCell className="text-sm">
                                                        {req.reviewer?.fullName || "System"}
                                                        <div className="text-xs text-muted-foreground">
                                                            {req.reviewedAt && format(new Date(req.reviewedAt), "MMM d, HH:mm")}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {activeTab === "PENDING" && (
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                                onClick={() => handleOpenApprove(req)}
                                                            >
                                                                <Check className="w-4 h-4 mr-1" /> Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                                onClick={() => handleOpenReject(req)}
                                                            >
                                                                <X className="w-4 h-4 mr-1" /> Reject
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Approve Dialog */}
            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Label Request</DialogTitle>
                        <DialogDescription>
                            Create the label <strong>{selectedRequest?.labelName}</strong> and add it to the project.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-md border text-sm">
                            <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: selectedRequest?.suggestedColor || '#ccc' }} />
                            <span className="font-medium">{selectedRequest?.labelName}</span>
                            <span className="text-muted-foreground ml-auto">Suggested by {selectedRequest?.requester?.fullName}</span>
                        </div>

                        <div className="space-y-2">
                            <Label>Category (Optional)</Label>
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Category</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Categorizing labels helps with organization and export.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApproveOpen(false)} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 text-white">
                            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Approve & Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Label Request</DialogTitle>
                        <DialogDescription>
                            Reject the request for <strong>{selectedRequest?.labelName}</strong>. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Reason (Optional)</Label>
                            <Textarea
                                placeholder="Why are you rejecting this request?"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={handleReject} disabled={actionLoading} variant="destructive">
                            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Reject Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
