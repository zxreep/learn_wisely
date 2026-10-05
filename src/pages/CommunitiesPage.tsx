import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, MessageCircle, Plus, Search, Send, Trash2, UsersRound } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CommentView, CommunityView, PostView } from "../../shared/contracts";
import { api, formatRelative, jsonBody } from "../lib/api";
import { queryClient } from "../lib/query";
import { Avatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage, LoadingBlock } from "../components/Status";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";

export function CommunitiesPage() {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const communities = useQuery({ queryKey: ["communities"], queryFn: () => api<CommunityView[]>("/communities") });
  const create = useMutation({ mutationFn: (input: { name: string; description: string }) => api<CommunityView>("/communities", { method: "POST", ...jsonBody(input) }), onSuccess: async () => { setCreateOpen(false); await queryClient.invalidateQueries({ queryKey: ["communities"] }); } });
  const filtered = (communities.data || []).filter((item) => !query || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); create.mutate({ name: String(data.get("name")), description: String(data.get("description")) }); }
  return <div className="page">
    <PageHeader eyebrow="Learn with others" title="Communities" description="Create a space or join one made by another student. Activity appears only when real members post." actions={<button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Create community</button>} />
    <div className="filter-bar glass-panel"><label className="search-field"><Search size={17} /><input aria-label="Search communities" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a community" /></label></div>
    {communities.isLoading ? <LoadingBlock label="Finding communities" /> : communities.error ? <ErrorMessage error={communities.error} /> : !communities.data?.length ? <EmptyState icon={UsersRound} title="No communities yet" text="Be the first to make a focused space for your subject, exam, or study group." action={<button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Create a community</button>} /> : filtered.length === 0 ? <EmptyState icon={Search} title="No communities match" text="Try a broader search." /> : <div className="community-grid">{filtered.map((community) => <Link to={`/communities/${community.id}`} className="community-card" key={community.id}><div className="community-mark">{community.name.slice(0, 1).toUpperCase()}</div><div><span className={`membership ${community.joined ? "is-joined" : ""}`}>{community.joined ? community.role === "owner" ? "You own this" : "Joined" : "Open community"}</span><h2>{community.name}</h2><p>{community.description || "No description yet."}</p><footer><span><UsersRound size={14} /> {community.memberCount} {community.memberCount === 1 ? "member" : "members"}</span><span>by @{community.owner.handle}</span></footer></div></Link>)}</div>}
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create a community"><form className="form-stack" onSubmit={submit}><label>Name<input name="name" required maxLength={60} placeholder="e.g. Organic chemistry study" /></label><label>Description<textarea name="description" maxLength={300} placeholder="What will members study together?" /></label><p className="form-note">You will be the owner and first member. No content is added automatically.</p><ErrorMessage error={create.error} /><div className="dialog-actions"><button type="button" className="button button--quiet" onClick={() => setCreateOpen(false)}>Cancel</button><button className="button button--primary" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create community"}</button></div></form></Dialog>
  </div>;
}

export function CommunityPage() {
  const { user } = useAuth();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const community = useQuery({ queryKey: ["community", id], queryFn: () => api<CommunityView>(`/communities/${id}`), enabled: Boolean(id) });
  const posts = useQuery({ queryKey: ["posts", id], queryFn: () => api<PostView[]>(`/communities/${id}/posts`), enabled: Boolean(id) });
  const membership = useMutation({ mutationFn: (join: boolean) => api(`/communities/${id}/${join ? "join" : "membership"}`, { method: join ? "POST" : "DELETE" }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["community", id] }); await queryClient.invalidateQueries({ queryKey: ["communities"] }); } });
  const createPost = useMutation({ mutationFn: (body: string) => api<PostView>(`/communities/${id}/posts`, { method: "POST", ...jsonBody({ body }) }), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["posts", id] }) });
  const deleteCommunity = useMutation({ mutationFn: () => api(`/communities/${id}`, { method: "DELETE" }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["communities"] }); navigate("/communities"); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const body = String(new FormData(form).get("body")); createPost.mutate(body, { onSuccess: () => form.reset() }); }
  if (community.isLoading) return <div className="page"><LoadingBlock label="Opening community" /></div>;
  if (community.error || !community.data) return <div className="page"><ErrorMessage error={community.error || new Error("Community not found.")} /></div>;
  const value = community.data;
  return <div className="page community-detail">
    <Link to="/communities" className="back-link"><ArrowLeft size={16} /> All communities</Link>
    <section className="community-hero glass-card"><div className="community-mark community-mark--large">{value.name.slice(0, 1).toUpperCase()}</div><div className="community-hero-main"><p className="eyebrow">Open community</p><h1>{value.name}</h1><p>{value.description || "No description yet."}</p><div className="community-meta"><span><UsersRound size={15} /> {value.memberCount} {value.memberCount === 1 ? "member" : "members"}</span><span>Created by @{value.owner.handle}</span></div></div><div className="community-hero-actions">{value.joined ? value.role === "owner" ? <button className="button button--danger" onClick={() => { if (confirm("Delete this community and all its posts?")) deleteCommunity.mutate(); }}><Trash2 size={16} /> Delete</button> : <button className="button button--quiet" disabled={membership.isPending} onClick={() => membership.mutate(false)}>Leave</button> : <button className="button button--primary" disabled={membership.isPending} onClick={() => membership.mutate(true)}>Join community</button>}</div></section>
    <ErrorMessage error={membership.error || deleteCommunity.error} />
    {value.joined ? <form className="composer glass-panel" onSubmit={submit}><Avatar name={user!.name} color={user!.avatarColor} /><textarea name="body" required maxLength={4000} aria-label="New community post" placeholder={`Share a question or useful idea with ${value.name}`} /><button className="button button--primary" disabled={createPost.isPending}><Send size={16} /> Post</button></form> : <div className="join-notice"><UsersRound size={18} /><span>Join to post, vote, and comment. You can still read the conversation.</span></div>}
    <ErrorMessage error={createPost.error || posts.error} />
    {posts.isLoading ? <LoadingBlock label="Loading posts" /> : !posts.data?.length ? <EmptyState icon={MessageCircle} title="No posts yet" text={value.joined ? "Start the first real conversation in this community." : "Join if you would like to start the conversation."} /> : <div className="post-feed">{posts.data.map((post) => <PostCard key={post.id} post={post} joined={value.joined} communityId={id} />)}</div>}
  </div>;
}

function PostCard({ post, joined, communityId }: { post: PostView; joined: boolean; communityId: string }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const vote = useMutation({ mutationFn: (value: -1 | 0 | 1) => api<{ score: number; myVote: number }>(`/posts/${post.id}/vote`, { method: "POST", ...jsonBody({ value }) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts", communityId] }) });
  const remove = useMutation({ mutationFn: () => api(`/posts/${post.id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts", communityId] }) });
  return <article className="post-card"><header><Avatar name={post.author.name} color={post.author.avatarColor} /><div><b>{post.author.name}</b><span>@{post.author.handle} · {formatRelative(post.createdAt)}</span></div>{post.canDelete && <button className="icon-button" aria-label="Delete post" onClick={() => { if (confirm("Delete this post?")) remove.mutate(); }}><Trash2 size={16} /></button>}</header><p className="post-body">{post.body}</p><footer><div className="vote-control"><button aria-label="Upvote" disabled={!joined || vote.isPending} className={post.myVote === 1 ? "is-active" : ""} onClick={() => vote.mutate(post.myVote === 1 ? 0 : 1)}><ArrowUp size={17} /></button><span>{post.score}</span><button aria-label="Downvote" disabled={!joined || vote.isPending} className={post.myVote === -1 ? "is-active" : ""} onClick={() => vote.mutate(post.myVote === -1 ? 0 : -1)}><ArrowDown size={17} /></button></div><button className="comment-button" onClick={() => setCommentsOpen(true)}><MessageCircle size={16} /> {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}</button></footer><ErrorMessage error={vote.error || remove.error} /><Dialog open={commentsOpen} onClose={() => setCommentsOpen(false)} title="Discussion"><Comments postId={post.id} joined={joined} communityId={communityId} /></Dialog></article>;
}

function Comments({ postId, joined, communityId }: { postId: string; joined: boolean; communityId: string }) {
  const comments = useQuery({ queryKey: ["comments", postId], queryFn: () => api<CommentView[]>(`/posts/${postId}/comments`) });
  const create = useMutation({ mutationFn: (body: string) => api<CommentView>(`/posts/${postId}/comments`, { method: "POST", ...jsonBody({ body }) }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["comments", postId] }); await queryClient.invalidateQueries({ queryKey: ["posts", communityId] }); } });
  const remove = useMutation({ mutationFn: (commentId: string) => api(`/comments/${commentId}`, { method: "DELETE" }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["comments", postId] }); await queryClient.invalidateQueries({ queryKey: ["posts", communityId] }); } });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; create.mutate(String(new FormData(form).get("body")), { onSuccess: () => form.reset() }); }
  return <div className="comments"><div className="comments-list">{comments.isLoading ? <LoadingBlock /> : !comments.data?.length ? <p className="widget-empty">No comments yet.</p> : comments.data.map((comment) => <div className="comment" key={comment.id}><Avatar name={comment.author.name} color={comment.author.avatarColor} size={32} /><div><p><b>{comment.author.name}</b> <span>@{comment.author.handle} · {formatRelative(comment.createdAt)}</span></p><div>{comment.body}</div></div>{comment.canDelete && <button className="icon-button icon-button--small" aria-label="Delete comment" onClick={() => remove.mutate(comment.id)}><Trash2 size={13} /></button>}</div>)}</div>{joined ? <form onSubmit={submit} className="comment-form"><input name="body" required maxLength={1500} aria-label="Write a comment" placeholder="Add to the discussion" /><button className="icon-button icon-button--gold" aria-label="Send comment" disabled={create.isPending}><Send size={17} /></button></form> : <p className="form-note">Join the community to comment.</p>}<ErrorMessage error={comments.error || create.error || remove.error} /></div>;
}
