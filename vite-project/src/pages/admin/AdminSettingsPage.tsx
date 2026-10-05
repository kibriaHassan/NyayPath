import { DEMO_ACCOUNTS } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'

export default function AdminSettingsPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Admin Settings</h1>
        <p className="mt-1 text-sm text-muted">সেশন ও প্ল্যাটফর্ম নিয়ন্ত্রণের সারাংশ।</p>
      </div>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">লগইন সেশন</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">নাম</dt>
            <dd className="font-medium">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-muted">ইমেইল</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-muted">রোল</dt>
            <dd className="font-medium">{user?.role}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">প্ল্যাটফর্ম কন্ট্রোল কভারেজ</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted">
          <li>উকিল — তালিকা, verify, পাবলিক ভিজিবিলিটি, স্থায়ী ডিলিট</li>
          <li>Staff — অ্যাকটিভ টগল, স্থায়ী ডিলিট</li>
          <li>মামলা — পূর্ণ তালিকা ও ক্যাসকেড ডিলিট (শুনানি/টাস্ক/ডকুমেন্ট)</li>
          <li>আদালত ক্যাটালগ — ধরন/আদালত/বিভাগ/জেলা CRUD</li>
          <li>কন্টাক্ট ইনবক্স — পাবলিক মেসেজ ম্যানেজমেন্ট</li>
          <li>সিস্টেম — Mongo/JSON ওভারভিউ ও ডেমো reseed</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-mist/40 p-5 text-sm">
        <p className="font-semibold text-ink">Demo Admin</p>
        <p className="mt-1 text-muted">
          {DEMO_ACCOUNTS.admin.email} / {DEMO_ACCOUNTS.admin.password}
        </p>
      </section>
    </div>
  )
}
