"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { notificationsApi, Notification } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2, Package, Truck, CreditCard, AlertCircle, CheckCircle, Info } from "lucide-react";

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  load: Package,
  trip: Truck,
  payment: CreditCard,
  warning: AlertCircle,
  success: CheckCircle,
  info: Info,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  load: "bg-green-500/20 text-green-400",
  trip: "bg-blue-500/20 text-blue-400",
  payment: "bg-amber-500/20 text-amber-400",
  warning: "bg-red-500/20 text-red-400",
  success: "bg-green-500/20 text-green-400",
  info: "bg-gray-500/20 text-gray-400",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchNotifications();
  }, [isAuthenticated, router]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationsApi.delete(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (!isAuthenticated) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-400 text-sm">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={handleMarkAllAsRead}
            variant="outline"
            className="border-[#1e4029] text-gray-300 hover:bg-[#1a3524]"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 border border-[#1e4029] rounded-2xl bg-[#162d1e]">
          <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = NOTIFICATION_ICONS[notification.type] || Info;
            const colorClass = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.info;
            
            return (
              <div
                key={notification.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-300",
                  notification.read 
                    ? "border-[#1e4029] bg-[#162d1e]" 
                    : "border-[#22c55e] bg-[#1a3524]"
                )}
              >
                <div className="flex gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-medium">{notification.title}</h3>
                      <span className="text-xs text-gray-500 shrink-0">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                    <div className="flex gap-2 mt-3">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-green-400 hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
