import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Download } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (train: number, val: number, test: number) => Promise<void>;
  isExporting: boolean;
}

export function ExportDialog({
  open,
  onClose,
  onExport,
  isExporting,
}: ExportDialogProps) {
  const [train, setTrain] = useState(70);
  const [val, setVal] = useState(20);
  const [test, setTest] = useState(10);

  const total = train + val + test;
  const isValid = total === 100 && train > 0 && val > 0 && test >= 0;

  const handleTrainChange = (v: number) => {
    setTrain(v);
    // Auto-adjust test to keep total = 100
    const remaining = 100 - v - val;
    setTest(Math.max(0, remaining));
  };

  const handleValChange = (v: number) => {
    setVal(v);
    const remaining = 100 - train - v;
    setTest(Math.max(0, remaining));
  };

  const handleExport = () => {
    if (!isValid) return;
    onExport(train / 100, val / 100, test / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export COCO JSON
          </DialogTitle>
          <DialogDescription>
            Dataset sẽ được chia thành 3 tập và đóng gói thành file{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">.zip</code>{" "}
            gồm <code className="text-xs bg-gray-100 px-1 rounded">train.json</code>,{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">val.json</code>,{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">test.json</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-green-700">
                Train (%)
              </Label>
              <Input
                type="number"
                min={1}
                max={98}
                value={train}
                onChange={(e) => handleTrainChange(Number(e.target.value))}
                className="text-center font-bold text-green-700 border-green-300 focus:ring-green-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-blue-700">
                Val (%)
              </Label>
              <Input
                type="number"
                min={1}
                max={98}
                value={val}
                onChange={(e) => handleValChange(Number(e.target.value))}
                className="text-center font-bold text-blue-700 border-blue-300 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-orange-700">
                Test (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={98}
                value={test}
                readOnly
                className="text-center font-bold text-orange-700 border-orange-300 bg-gray-50 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Visual split bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 transition-all duration-300"
              style={{ width: `${train}%` }}
            />
            <div
              className="bg-blue-500 transition-all duration-300"
              style={{ width: `${val}%` }}
            />
            <div
              className="bg-orange-500 transition-all duration-300"
              style={{ width: `${test}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-green-600">Train: {train}%</span>
            <span className="text-blue-600">Val: {val}%</span>
            <span className="text-orange-600">Test: {test}%</span>
          </div>

          {total !== 100 && (
            <p className="text-sm text-red-500 text-center">
              Tổng phải bằng 100% (hiện tại: {total}%)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Huỷ
          </Button>
          <Button
            onClick={handleExport}
            disabled={!isValid || isExporting}
            className="min-w-[120px]"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Đang xuất..." : "Export ZIP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
