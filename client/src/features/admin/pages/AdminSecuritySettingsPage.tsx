import { useState, useEffect } from "react";
import { adminApi } from "../../../services/admin.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { toast } from "sonner";
import { Shield, Save, Loader2, Clock, AlertCircle } from "lucide-react";

export function AdminSecuritySettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [expirationMinutes, setExpirationMinutes] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const config = await adminApi.getOtpConfig();
        setEnabled(config.enabled);
        setExpirationMinutes(config.expirationMinutes);
      } catch (error) {
        console.error("Failed to load OTP config:", error);
        toast.error("Không thể tải cấu hình bảo mật");
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await adminApi.updateOtpConfig({
        enabled,
        expirationMinutes,
      });
      toast.success("Cấu hình bảo mật đã được cập nhật");
      
      // Broadcast update to other tabs if needed
      const channel = new BroadcastChannel('system_config_channel');
      channel.postMessage({ type: 'config_updated', target: 'otp' });
      channel.close();
      
    } catch (error) {
      console.error("Failed to update OTP config:", error);
      toast.error("Cập nhật cấu hình thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage system security settings and Two-Factor Authentication (2FA).
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Shield className="w-5 h-5" />
              OTP Authentication (Email)
            </CardTitle>
            <CardDescription>
              When enabled, users will be required to enter an OTP code sent via Email after entering their password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="space-y-0.5">
                <Label htmlFor="otp-toggle" className="text-base font-semibold">
                  Enable OTP Login
                </Label>
                <p className="text-sm text-muted-foreground">
                  Require a verification code for all password-based logins.
                </p>
              </div>
              <Switch
                id="otp-toggle"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            <div className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="expiration" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Code Expiration (minutes)
                </Label>
                <Input
                  id="expiration"
                  type="number"
                  min={1}
                  max={60}
                  value={expirationMinutes}
                  onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 5)}
                  disabled={!enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 5 - 10 minutes for optimal security.
                </p>
              </div>
            </div>

            {!enabled && (
              <div className="flex items-start gap-3 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <p>
                  <strong>Note:</strong> Disabling OTP reduces the security level of the system. Users will only need a password to gain access.
                </p>
              </div>
            )}

            <div className="pt-4 border-t flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
