"use client";
import { useEffect, useState } from "react";

export default function ChatUnreadBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function update() {
      if (!document.hidden) {
        try {
          const response = await fetch("/api/chat", { cache: "no-store", signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            if (!stopped) setCount(data.rooms.reduce((total: number, room: { unread: number }) => total + room.unread, 0));
          }
        } catch { /* The chat page displays connection errors; keep navigation usable. */ }
      }
      if (!stopped) timer = setTimeout(update, 20000);
    }
    void update();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, []);
  return count ? <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-red" aria-label={`${count} unread chat messages`}>{count > 99 ? "99+" : count}</span> : null;
}
