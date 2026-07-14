import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api, getErrorMessage } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { MemberRole, User } from "../../types";
import clsx from "../../lib/clsx";
import DevLinkNotice from "../../components/DevLinkNotice";
import ConfirmActionDialog from "../../components/ConfirmActionDialog";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";

interface CreateForm {
  name: string;
  email: string;
  phone: string;
}

interface EditForm {
  name: string;
  email: string;
  phone: string;
  password: string;
}

function RoleToggle({ value, onChange, disabled }: { value: MemberRole; onChange: (v: MemberRole) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-line-soft/40 p-0.5">
      {(["TEAM_MEMBER", "COACH"] as MemberRole[]).map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={clsx(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
            value === option ? "bg-surface text-brand-700 shadow-soft" : "text-ink-muted hover:text-ink"
          )}
        >
          {option === "TEAM_MEMBER" ? "Team Member" : "Coach"}
        </button>
      ))}
    </div>
  );
}

function roleLabel(memberRole: MemberRole | null | undefined) {
  return memberRole === "COACH" ? "Coach" : "Team Member";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const [team, setTeam] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<MemberRole>("TEAM_MEMBER");
  const [newMemberInviteLink, setNewMemberInviteLink] = useState<string | null>(null);
  const [resendLinks, setResendLinks] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>("TEAM_MEMBER");
  const [adminAction, setAdminAction] = useState<{ member: User; makeAdmin: boolean } | null>(null);
  const [adminActionBusy, setAdminActionBusy] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const createForm = useForm<CreateForm>();
  const editForm = useForm<EditForm>();

  async function load() {
    const res = await api.get<User[]>("/contractors?includeAdmins=true");
    setTeam(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(data: CreateForm) {
    setError(null);
    setNewMemberInviteLink(null);
    try {
      const res = await api.post<User & { devInviteLink?: string }>("/contractors", {
        ...data,
        memberRole: newRole,
        phone: data.phone || undefined,
      });
      createForm.reset();
      setNewRole("TEAM_MEMBER");
      if (res.data.devInviteLink) setNewMemberInviteLink(res.data.devInviteLink);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function resendInvite(member: User) {
    setError(null);
    try {
      const res = await api.post<{ sent: boolean; devInviteLink?: string }>(`/contractors/${member.id}/resend-invite`);
      if (res.data.devInviteLink) {
        setResendLinks((prev) => ({ ...prev, [member.id]: res.data.devInviteLink! }));
      } else {
        setResendLinks((prev) => {
          const next = { ...prev };
          delete next[member.id];
          return next;
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function openEdit(member: User) {
    setEditing(member);
    setEditRole(member.memberRole ?? "TEAM_MEMBER");
    editForm.reset({ name: member.name, email: member.email, phone: member.phone ?? "", password: "" });
  }

  async function onSaveEdit(data: EditForm) {
    if (!editing) return;
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        memberRole: editRole,
      };
      if (data.password) payload.password = data.password;
      await api.patch(`/contractors/${editing.id}`, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleActive(member: User) {
    await api.patch(`/contractors/${member.id}`, { isActive: !member.isActive });
    load();
  }

  async function confirmAdminAction() {
    if (!adminAction) return;
    const { member, makeAdmin } = adminAction;
    setAdminActionBusy(true);
    setAdminActionError(null);
    try {
      await api.patch(`/contractors/${member.id}`, { role: makeAdmin ? "ADMIN" : "CONTRACTOR" });
      setAdminAction(null);
      // If the acting admin just changed their own access level, refresh
      // the session so the sidebar/routes reflect it immediately - the
      // account itself stays logged in either way, only its permissions
      // for future requests change.
      if (currentUser?.id === member.id) await refreshUser();
      load();
    } catch (err) {
      setAdminActionError(getErrorMessage(err));
    } finally {
      setAdminActionBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.delete(`/contractors/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  function statusBadge(member: User) {
    if (!member.isActive) return { label: "Inactive", className: "bg-line-soft text-ink-faint" };
    if (!member.activatedAt) return { label: "Invited", className: "bg-accent-50 text-accent-700" };
    return { label: "Active", className: "bg-brand-50 text-brand-700" };
  }

  return (
    <div className="mx-auto max-w-3xl overflow-y-auto p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">Team</h1>

      <form onSubmit={createForm.handleSubmit(onCreate)} className="mb-8 rounded-xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-3 text-sm font-medium text-ink">Add a team member</p>
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Role</label>
          <RoleToggle value={newRole} onChange={setNewRole} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Name</label>
            <input
              {...createForm.register("name", { required: true })}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Email</label>
            <input
              type="email"
              {...createForm.register("email", { required: true })}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Phone (optional)</label>
            <input
              type="tel"
              {...createForm.register("phone")}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <button
            disabled={createForm.formState.isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98] disabled:opacity-50"
          >
            Send invite
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">We'll email them a link to set up their own password.</p>
        {newMemberInviteLink && <DevLinkNotice label="Invite link for the member you just added:" link={newMemberInviteLink} />}
      </form>

      {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-line-soft/60 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Contact</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {team.map((member) => {
              const status = statusBadge(member);
              const resendLink = resendLinks[member.id];
              return (
                <tr key={member.id} className="transition-colors duration-150 hover:bg-line-soft/30">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                        {initials(member.name)}
                      </span>
                      <span className="font-medium text-ink">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {member.role === "ADMIN" ? (
                      <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-canvas">Admin</span>
                    ) : (
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          member.memberRole === "COACH" ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-700"
                        )}
                      >
                        {roleLabel(member.memberRole)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-ink-muted">
                    <div>{member.email}</div>
                    {member.phone && <div className="text-xs text-ink-faint">{member.phone}</div>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <button onClick={() => openEdit(member)} className="mr-3 font-medium text-brand-600 hover:underline">
                      Edit
                    </button>
                    {!member.activatedAt && member.isActive && (
                      <button onClick={() => resendInvite(member)} className="mr-3 text-brand-600 hover:underline">
                        Resend invite
                      </button>
                    )}
                    <button onClick={() => toggleActive(member)} className="mr-3 text-ink-faint hover:underline">
                      {member.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => setAdminAction({ member, makeAdmin: member.role !== "ADMIN" })}
                      className="mr-3 text-accent-600 hover:underline"
                    >
                      {member.role === "ADMIN" ? "Remove Admin" : "Make Admin"}
                    </button>
                    <button onClick={() => setDeleteTarget(member)} className="font-medium text-danger-600 hover:underline">
                      Delete
                    </button>
                    {resendLink && (
                      <div className="mt-2 text-left">
                        <DevLinkNotice label="New invite link:" link={resendLink} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {team.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-faint">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-[2px]" onClick={() => setEditing(null)}>
          <form
            onSubmit={editForm.handleSubmit(onSaveEdit)}
            onClick={(e) => e.stopPropagation()}
            className="w-96 rounded-xl border border-line bg-surface p-5 shadow-soft-lg"
          >
            <h3 className="mb-4 font-display text-base font-semibold text-ink">Edit team member</h3>

            {editing.role === "ADMIN" ? (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-ink-muted">Role</label>
                <p className="text-sm text-ink-muted">
                  Admin. Use "Remove Admin" on the Team page to revert them to a Team Member/Coach role.
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-ink-muted">Role</label>
                <RoleToggle value={editRole} onChange={setEditRole} />
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-ink-muted">Name</label>
              <input
                {...editForm.register("name", { required: true })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-ink-muted">Email</label>
              <input
                type="email"
                {...editForm.register("email", { required: true })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-ink-muted">Phone</label>
              <input
                type="tel"
                {...editForm.register("phone")}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-ink-muted">Set password (optional override)</label>
              <input
                type="password"
                {...editForm.register("password", { minLength: 8 })}
                placeholder="Leave blank to leave as-is"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted transition-all duration-150 hover:bg-line-soft active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-soft transition-all duration-150 hover:bg-brand-700 hover:shadow-soft-md active:scale-[0.98]"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {adminAction && (
        <ConfirmActionDialog
          title={adminAction.makeAdmin ? `Make ${adminAction.member.name} an admin?` : `Remove admin access from ${adminAction.member.name}?`}
          description={
            adminAction.makeAdmin
              ? "They'll get full access to manage team members, clients/projects, tasks, and see everyone's time entries and reports."
              : `They'll be reverted to a ${roleLabel(adminAction.member.memberRole)} and lose access to admin-only areas (Team, Projects, Reports for others, Holidays).`
          }
          confirmLabel={adminAction.makeAdmin ? "Make Admin" : "Remove Admin"}
          busy={adminActionBusy}
          error={adminActionError}
          onConfirm={confirmAdminAction}
          onCancel={() => {
            setAdminAction(null);
            setAdminActionError(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title={`Delete ${deleteTarget.name}?`}
          description={
            deleteTarget._count?.timeEntries
              ? `This permanently removes ${deleteTarget.name}'s account. ${
                  deleteTarget._count.timeEntries === 1 ? "1 time entry" : `${deleteTarget._count.timeEntries} time entries`
                } logged by them will be moved to a "Former Team Member" record so historical reports stay accurate. This cannot be undone.`
              : `This permanently removes ${deleteTarget.name}'s account. This cannot be undone.`
          }
          busy={deleteBusy}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
