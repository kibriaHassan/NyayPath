import { Link } from 'react-router-dom'
import { Scale, Share2, Globe, Mail } from 'lucide-react'

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-ink text-sand">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-bronze-light" />
            <span className="font-display text-xl font-semibold">NyayPath</span>
          </div>
          <p className="mt-3 text-sm text-sand/75">
            মামলার তথ্য, পরবর্তী তারিখ এবং উকিল ডিরেক্টরি — এক প্ল্যাটফর্মে।
          </p>
        </div>

        <div>
          <h4 className="font-semibold">লিঙ্ক</h4>
          <ul className="mt-3 space-y-2 text-sm text-sand/80">
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">অ্যাকাউন্ট</h4>
          <ul className="mt-3 space-y-2 text-sm text-sand/80">
            <li><Link to="/register" className="hover:text-white">Lawyer Registration</Link></li>
            <li><Link to="/register/staff" className="hover:text-white">Staff Registration</Link></li>
            <li><Link to="/login?role=staff" className="hover:text-white">Staff Login</Link></li>
            <li><Link to="/login" className="hover:text-white">Login</Link></li>
            <li><Link to="/cases/search" className="hover:text-white">Case Search</Link></li>
            <li><Link to="/lawyers" className="hover:text-white">Find a Lawyer</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">যোগাযোগ</h4>
          <ul className="mt-3 space-y-2 text-sm text-sand/80">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@nyaypath.bd</li>
            <li className="flex items-center gap-3 pt-2">
              <a href="#" aria-label="Share" className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><Share2 className="h-4 w-4" /></a>
              <a href="#" aria-label="Website" className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><Globe className="h-4 w-4" /></a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page py-4 text-xs text-sand/60">
          <p>
            এই প্ল্যাটফর্মে প্রদর্শিত তথ্য শুধুমাত্র তথ্যগত উদ্দেশ্যে ব্যবহারের জন্য। মামলার তথ্যের চূড়ান্ত সত্যতা সংশ্লিষ্ট আদালত/কর্তৃপক্ষের রেকর্ড দ্বারা যাচাই করতে হবে।
          </p>
          <p className="mt-2">© {new Date().getFullYear()} NyayPath. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
