

## Problem Analysis

There are two issues:

1. **Link chứa mã mời**: Khi admin copy link đăng ký, hàm `copyRegistrationLink` tạo ra text dạng `https://.../register/contest/{id} (Mã mời: NVC2025)` -- phần `(Mã mời: NVC2025)` bị dính vào URL gây lỗi khi paste. Cần thay đổi: đưa mã mời vào URL parameter hoặc tách rõ ràng hơn.

2. **Luồng đăng ký chưa hoàn chỉnh**: Cần cải thiện flow để mã mời nằm trong URL, thí sinh chỉ cần mở link là tự động điền mã, sau đó xác nhận và thanh toán.

## Plan

### 1. Thay đổi URL format -- đưa invite code vào URL
- Route mới: `/register/contest/:contestId/:inviteCode` (thêm optional param)
- Khi admin copy link → copy URL dạng `/register/contest/{contestId}/{INVITE_CODE}` (không có text thừa)
- Thêm route mới trong `App.tsx`

### 2. Tự động điền mã mời từ URL
- Trong `ContestRegistration.tsx`, đọc `inviteCode` từ `useParams`
- Nếu có invite code trong URL → tự động lookup và skip bước nhập mã, nhảy thẳng sang bước xác nhận

### 3. Fix hàm `copyRegistrationLink` trong Admin page
- Thay `${url} (Mã mời: ${code})` → `${url}/${code}` (chỉ copy URL thuần)

### 4. Cải thiện luồng thanh toán
Flow hiện tại đã có payment step (bank transfer info). Cần bổ sung:
- Cho phép upload minh chứng chuyển khoản (ảnh) vào `bank_transfer_proof`
- Admin duyệt (đã có `useApproveRegistration` → update payment_status + add to contest_participants)
- Hiển thị minh chứng trong admin page

### Files to modify:
- `src/App.tsx` -- thêm route `/register/contest/:contestId/:inviteCode`
- `src/pages/ContestRegistration.tsx` -- đọc inviteCode từ URL, auto-lookup, upload proof
- `src/pages/ContestRegistrationAdmin.tsx` -- fix copyRegistrationLink, hiển thị proof
- `src/hooks/useContestRegistrations.ts` -- thêm mutation upload proof

