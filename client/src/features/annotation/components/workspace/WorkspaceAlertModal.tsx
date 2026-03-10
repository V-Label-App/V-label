import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";

interface WorkspaceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  variant?: "default" | "destructive" | "success";
}

export function WorkspaceAlertModal({
  isOpen,
  onClose,
  title,
  description,
  variant = "default",
}: WorkspaceAlertModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 text-white shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle
            className={`text-xl font-semibold ${
              variant === "destructive"
                ? "text-red-400"
                : variant === "success"
                  ? "text-green-400"
                  : "text-white"
            }`}
          >
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onClose}
            className={`${
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700"
                : variant === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
            } text-white font-medium px-8`}
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
