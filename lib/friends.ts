export type FriendRelationship = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "FRIENDS";

export type Friend = {
  clerkId: string;
  displayName: string | null;
  profileImageURL: string | null;
  friendsSince: string | null;
};

export type FriendRequestItem = {
  id: string;
  clerkId: string;
  displayName: string | null;
  profileImageURL: string | null;
  createdAt: string;
};

export type FriendSearchResult = {
  clerkId: string;
  displayName: string | null;
  profileImageURL: string | null;
  relationship: FriendRelationship;
};

export type NotificationType = "FRIEND_REQUEST" | "FRIEND_REQUEST_ACCEPTED" | "FRIEND_REQUEST_DECLINED";

export type FriendNotification = {
  id: string;
  type: NotificationType;
  actorId: string;
  actorDisplayName: string | null;
  actorProfileImageURL: string | null;
  createdAt: string;
};

export async function getFriends(): Promise<Friend[]> {
  const response = await fetch("/api/friends", { cache: "no-store" });
  if (!response.ok) return [];
  return (await response.json()) as Friend[];
}

export async function getIncomingRequests(signal?: AbortSignal): Promise<FriendRequestItem[]> {
  const response = await fetch("/api/friends/requests", { cache: "no-store", signal });
  if (!response.ok) return [];
  return (await response.json()) as FriendRequestItem[];
}

export async function getOutgoingRequests(): Promise<FriendRequestItem[]> {
  const response = await fetch("/api/friends/requests/outgoing", { cache: "no-store" });
  if (!response.ok) return [];
  return (await response.json()) as FriendRequestItem[];
}

// A blank query is intentional, not a no-op — the backend falls back to
// recently-joined users (see lumo-user-svc's friends.Service.Search), which
// is what the Search tab shows by default before the caller types anything.
export async function searchUsers(query: string, signal?: AbortSignal): Promise<FriendSearchResult[]> {
  const response = await fetch(`/api/friends/search?query=${encodeURIComponent(query)}`, { cache: "no-store", signal });
  if (!response.ok) return [];
  return (await response.json()) as FriendSearchResult[];
}

// What a send actually resolved to — it isn't always a new pending request.
// Sending to someone whose own request to you is already pending accepts it
// instead, so you come out of it as friends, not as a sender waiting for an
// answer (see lumo-user-svc's friends.SendOutcome).
export type SendRequestStatus = "PENDING" | "FRIENDS" | "FAILED";

export async function sendFriendRequest(addresseeId: string): Promise<SendRequestStatus> {
  const response = await fetch("/api/friends/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresseeId }),
  });
  if (!response.ok) return "FAILED";

  // Treat an unreadable/unexpected body as a plain pending send rather than a
  // failure: the request itself succeeded, and reporting it as failed would
  // undo a state change the server has already made.
  try {
    const data = (await response.json()) as { status?: SendRequestStatus } | null;
    return data?.status === "FRIENDS" ? "FRIENDS" : "PENDING";
  } catch {
    return "PENDING";
  }
}

export async function cancelOrDeclineRequest(id: string): Promise<boolean> {
  const response = await fetch(`/api/friends/requests/${encodeURIComponent(id)}`, { method: "DELETE" });
  return response.ok;
}

export async function acceptFriendRequest(id: string): Promise<boolean> {
  const response = await fetch(`/api/friends/requests/${encodeURIComponent(id)}/accept`, { method: "POST" });
  return response.ok;
}

export async function removeFriend(clerkId: string): Promise<boolean> {
  const response = await fetch(`/api/friends/${encodeURIComponent(clerkId)}`, { method: "DELETE" });
  return response.ok;
}

export async function getNotificationCount(): Promise<number> {
  const response = await fetch("/api/friends/notifications/count", { cache: "no-store" });
  if (!response.ok) return 0;
  const data = (await response.json()) as { count: number };
  return data.count;
}

// Consumes (deletes) the notifications server-side as a side effect — call
// this only when the user is actually opening the notifications tray, not
// for background polling (use getNotificationCount for that).
export async function consumeNotifications(): Promise<FriendNotification[]> {
  const response = await fetch("/api/friends/notifications", { cache: "no-store" });
  if (!response.ok) return [];
  return (await response.json()) as FriendNotification[];
}
