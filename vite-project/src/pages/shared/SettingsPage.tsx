import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">অ্যাকাউন্ট ও নোটিফিকেশন পছন্দসমূহ</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Account</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input label="Display Name" defaultValue={user?.name} />
            <Input label="Email" defaultValue={user?.email} />
            <Input label="New Password" type="password" placeholder="••••••••" />
            <Button
              onClick={() => {
                setSaved(true)
              }}
            >
              Save Changes
            </Button>
            {saved && <p className="text-sm text-success">সংরক্ষণ হয়েছে (মক)</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Future Reminders</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              'SMS reminder',
              'Email reminder',
              'WhatsApp notification',
              'Hearing reminder',
            ].map((item) => (
              <label key={item} className="flex items-center justify-between rounded-lg bg-slate-panel px-3 py-2">
                <span>{item}</span>
                <input type="checkbox" defaultChecked={item.includes('Email') || item.includes('Hearing')} />
              </label>
            ))}
            <p className="text-xs text-muted">
              এই অপশনগুলো ভবিষ্যৎ ব্যাকএন্ড ইন্টিগ্রেশনের জন্য UI-ready রাখা হয়েছে।
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
