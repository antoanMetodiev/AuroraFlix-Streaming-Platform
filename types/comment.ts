export type Comment = {
  id: string;
  commentText: string;
  authorUsername: string;
  authorFullName: string;
  authorImgURL: string | null;
  authorId: string;
  createdAt: string;
};

export type ReactionUser = {
  userId: string;
  username: string;
  fullName: string;
  imgURL: string | null;
  createdAt: string;
};

export type CommentReactions = {
  likes: ReactionUser[];
  dislikes: ReactionUser[];
};
