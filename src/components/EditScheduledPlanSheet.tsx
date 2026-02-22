import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScheduledPlansStore, ScheduledPlan } from "@/store/scheduledPlansStore";
import { ConflictWarningCard } from "./ConflictWarningCard";

interface EditScheduledPlanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ScheduledPlan;
}

export function EditScheduledPlanSheet({ open, onOpenChange, plan }: EditScheduledPlanSheetProps) {
  const [date, setDate] = useState(plan.scheduled_date);
  const [time, setTime] = useState(plan.scheduled_time);
  const [restaurantConfirmation, setRestaurantConfirmation] = useState(
    (plan.confirmation_numbers as any)?.restaurant ?? ""
  );
  const [activityConfirmation, setActivityConfirmation] = useState(
    (plan.confirmation_numbers as any)?.activity ?? ""
  );
  const [notes, setNotes] = useState((plan as any).notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState(plan.availability_status ?? "pending");

  const updateScheduledPlan = useScheduledPlansStore((s) => s.updateScheduledPlan);
  const fetchScheduledPlans = useScheduledPlansStore((s) => s.fetchScheduledPlans);

  // Reset state when plan changes
  useEffect(() => {
    if (open) {
      setDate(plan.scheduled_date);
      setTime(plan.scheduled_time);
      setRestaurantConfirmation((plan.confirmation_numbers as any)?.restaurant ?? "");
      setActivityConfirmation((plan.confirmation_numbers as any)?.activity ?? "");
      setNotes((plan as any).notes ?? "");
      setConflicts((plan.conflict_warnings as any[]) ?? []);
      setAvailabilityStatus(plan.availability_status ?? "pending");
    }
  }, [open, plan]);

  const isDirty = useMemo(() => {
    const origConf = plan.confirmation_numbers as any;
    return (
      date !== plan.scheduled_date ||
      time !== plan.scheduled_time ||
      restaurantConfirmation !== (origConf?.restaurant ?? "") ||
      activityConfirmation !== (origConf?.activity ?? "") ||
      notes !== ((plan as any).notes ?? "")
    );
  }, [date, time, restaurantConfirmation, activityConfirmation, notes, plan]);

  const dateTimeChanged = date !== plan.scheduled_date || time !== plan.scheduled_time;

  // Re-check availability when date/time changes
  useEffect(() => {
    if (!dateTimeChanged || !open) return;

    const timeout = setTimeout(() => {
      checkAvailability(date, time);
    }, 500); // debounce

    return () => clearTimeout(timeout);
  }, [date, time]);

  const checkAvailability = async (checkDate: string, checkTime: string) => {
    setIsCheckingAvailability(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      const response = await supabase.functions.invoke("check-availability", {
        body: {
          restaurantId: plan.restaurant_id,
          activityId: plan.activity_id,
          restaurantHours: plan.restaurant_hours,
          activityHours: plan.activity_hours,
          scheduledDate: checkDate,
          scheduledTime: checkTime,
          userId: user?.id,
          excludePlanId: plan.id, // don't conflict with itself
        },
      });

      if (response?.data) {
        setConflicts(response.data.conflicts ?? []);
        setAvailabilityStatus(response.data.status ?? "pending");
      }
    } catch (error) {
      console.error("Availability check failed:", error);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSave = async () => {
    if (!date || !time) {
      toast.error("Date and time are required");
      return;
    }

    setIsSaving(true);
    try {
      const confirmationNumbers =
        restaurantConfirmation || activityConfirmation
          ? { restaurant: restaurantConfirmation || undefined, activity: activityConfirmation || undefined }
          : undefined;

      const updates: Partial<ScheduledPlan> = {
        scheduled_date: date,
        scheduled_time: time,
        confirmation_numbers: confirmationNumbers,
        availability_status: availabilityStatus,
        conflict_warnings: conflicts,
      };

      await updateScheduledPlan(plan.id, updates);
      onOpenChange(false);
      toast.success("Plan updated");
      fetchScheduledPlans(); // refresh list
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl">Edit Plan</SheetTitle>
          <SheetDescription>
            {plan.restaurant_name} + {plan.activity_name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Availability check indicator */}
          {isCheckingAvailability && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking availability…
            </div>
          )}

          {/* Conflict warnings */}
          {conflicts.length > 0 && !isCheckingAvailability && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Conflicts detected
              </div>
              {conflicts.map((conflict: any, idx: number) => (
                <ConflictWarningCard key={idx} conflict={conflict} />
              ))}
            </div>
          )}

          {/* Confirmation Numbers */}
          <div className="space-y-3 pt-4 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground">Confirmation Numbers</p>
            {plan.restaurant_name !== "No Restaurant" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Restaurant</Label>
                <Input
                  placeholder="Restaurant confirmation #"
                  value={restaurantConfirmation}
                  onChange={(e) => setRestaurantConfirmation(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
            {plan.activity_name !== "No Activity" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Activity</Label>
                <Input
                  placeholder="Activity confirmation #"
                  value={activityConfirmation}
                  onChange={(e) => setActivityConfirmation(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
          </div>

          {/* Save */}
          <div className="pt-4 space-y-3">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {conflicts.length > 0 ? "Save Anyway" : "Save Changes"}
            </Button>
            {conflicts.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Saving will proceed despite conflicts above
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
