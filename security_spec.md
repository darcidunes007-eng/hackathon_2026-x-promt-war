# SkillPath AI Security Specification

## 1. Data Invariants
1. **Identity Binding**: A `students/{uid}` document can only be created when `request.auth != null`, `request.auth.uid == uid`, and `incoming().uid == uid`.
2. **No Self-Assigned Admin**: On `students/{uid}` creation, `incoming().role` MUST equal `'student'`. Users cannot promote themselves to `'admin'` on create or update.
3. **PII Isolation**: `students/{uid}` contains `email` and personal academic data; `get` is restricted strictly to `isOwner(uid) || isAdmin()`, and `list` is restricted strictly to `isAdmin()`.
4. **Master Gate Subcollections**: `assessments`, `mentorSessions`, and `activity` under `/students/{uid}/...` verify parent `/students/{uid}` existence and ownership (`uid == request.auth.uid`) or `isAdmin()`.
5. **Temporal Integrity & Immortality**: `createdAt` and `updatedAt` must equal `request.time` on create; `createdAt` and `uid` remain immutable on update; `updatedAt == request.time` on update.
6. **Strict Schema & Bounds**: Every string has `.size()` caps, arrays have `.size() <= MAX` bounds, IDs match `^[a-zA-Z0-9_\\-]+$`, and `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)` block shadow fields.

## 2. Dirty Dozen Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Self-Admin Escalation on Create**: Create `students/{uid}` with `{ role: 'admin', ... }`.
2. **Role Tampering on Update**: Student updates own `students/{uid}` with `{ role: 'admin', updatedAt: serverTimestamp() }`.
3. **Shadow Field Injection**: Create/update `students/{uid}` with `{ isVerified: true }` extra field.
4. **Cross-User Read (PII Leak)**: User A attempts `getDoc(doc(db, 'students', userB_uid))`.
5. **Blanket Student List**: Non-admin user attempts `getDocs(collection(db, 'students'))`.
6. **Client-Forged Timestamp**: Create `students/{uid}` with `createdAt: new Date('2020-01-01')`.
7. **Immutable Field Mutation**: Update `students/{uid}` changing `uid` or `createdAt`.
8. **ID Poisoning**: Write to `students/bad$id!!` or 300-char doc ID.
9. **Unbounded Array / Payload DoS**: Update `careerInterests` with 50 entries or `displayName` with 5,000 chars.
10. **Admin Spoof Without Verified Email**: Unverified token attempting admin read/write.
11. **Orphaned Subcollection Write**: Write `students/nonexistent_uid/assessments/a1` when parent does not exist or belongs to another user.
12. **Admin Registry Tampering**: Student attempts `setDoc(doc(db, 'admins', myUid), { uid: myUid, createdAt: serverTimestamp() })`.
