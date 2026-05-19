import React, { useState } from 'react';
import { ArrowLeft, Key, Mail, CheckCircle2, ShieldAlert, Monitor, Info } from 'lucide-react';

interface InstructionsPS4PageProps {
  onBack: () => void;
}

export const InstructionsPS4Page = ({ onBack }: InstructionsPS4PageProps) => {
  const [lang, setLang] = useState<'both' | 'en' | 'ar'>('both');

  const images = {
    step1: "https://cdn.shopify.com/s/files/1/0604/6177/6957/files/Screenshot_2026-04-11_181043.png?v=1775924199",
    step2_newuser: "https://cdn.shopify.com/s/files/1/0604/6177/6957/files/494823013_1007011168310942_1376587132874025166_n_1.jpg?v=1747060522",
    step2_login: "https://cdn.shopify.com/s/files/1/0604/6177/6957/files/2.png?v=1747061487",
    step2_2fa: "https://cdn.shopify.com/s/files/1/0604/6177/6957/files/491214138_684671214320190_4908743133789853547_n.jpg?v=1747061628",
    step3_primary: "https://cdn.shopify.com/s/files/1/0604/6177/6957/files/How-to-activate-primary-PS4-7-sc.jpg?v=1747061726"
  };

  const showEn = lang === 'both' || lang === 'en';
  const showAr = lang === 'both' || lang === 'ar';

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-brand-red/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-brand-red/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 relative z-10">
        {/* Navigation back */}
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Retrieval Zone
        </button>

        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-border-subtle">
          <div>
            <p className="text-[10px] font-black text-brand-red tracking-[0.4em] uppercase mb-2 italic">Operation Manual</p>
            <h1 className="text-4xl md:text-6xl font-black text-text-primary tracking-tighter font-display uppercase italic leading-none">
              Instructions for PS4
            </h1>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-3 italic">
              How to Use Your Order • طريقة استخدام الطلب
            </p>
          </div>

          {/* Language Switcher */}
          <div className="flex bg-bg-secondary p-1 rounded-2xl border border-border-subtle self-start">
            <button
              onClick={() => setLang('both')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'both' ? 'bg-brand-red text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Bilingual
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'en' ? 'bg-brand-red text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('ar')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'ar' ? 'bg-brand-red text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              العربية
            </button>
          </div>
        </div>

        {/* STEP 1: RECEIVE DETAILS */}
        <div className="mb-16">
          <div className="p-8 md:p-12 rounded-[2.5rem] bg-bg-card border border-border-subtle hover:border-brand-red/20 transition-all shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <span className="h-12 w-12 rounded-2xl bg-brand-red/10 border border-brand-red/25 flex items-center justify-center text-brand-red font-display font-black text-xl italic">01</span>
              <div>
                <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight italic">
                  Step 1: Receive Account Details
                </h2>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest italic mt-1">الخطوة 1: استلام بيانات الحساب</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                {/* English Content */}
                {showEn && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-text-primary leading-relaxed">
                      After completing your purchase, you will receive the account details:
                    </p>
                    <div className="p-5 rounded-2xl bg-bg-dark border border-border-subtle space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-text-secondary">
                        <Mail className="h-4 w-4 text-brand-red" />
                        <span>Email: Account email</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-text-secondary">
                        <Key className="h-4 w-4 text-brand-red" />
                        <span>Password: Account password (case sensitive)</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-text-secondary">
                        <CheckCircle2 className="h-4 w-4 text-brand-red" />
                        <span>2FA Code: Verification code</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Arabic Content */}
                {showAr && (
                  <div className="space-y-4 text-right" dir="rtl">
                    <p className="text-sm font-semibold text-text-primary leading-relaxed">
                      بعد إتمام الشراء، سيتم إرسال بيانات الحساب إليك:
                    </p>
                    <div className="p-5 rounded-2xl bg-bg-dark border border-border-subtle space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-text-secondary justify-start">
                        <Mail className="h-4 w-4 text-brand-red" />
                        <span>الإيميل: البريد الإلكتروني للحساب</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-text-secondary justify-start">
                        <Key className="h-4 w-4 text-brand-red" />
                        <span>كلمة المرور: حساسة لحروف كبيرة وصغيرة</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-text-secondary justify-start">
                        <CheckCircle2 className="h-4 w-4 text-brand-red" />
                        <span>كود التحقق: رمز التحقق (2FA)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning note */}
                <div className="p-6 rounded-2xl bg-brand-red/5 border border-brand-red/20 space-y-3">
                  <div className="flex items-center gap-3 text-brand-red font-black text-[10px] uppercase tracking-widest italic">
                    <ShieldAlert className="h-5 w-5" />
                    <span>Security Warning • تحذير أمني</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed uppercase font-bold tracking-wide">
                    Changing the account password is strictly prohibited. Violation will result in permanent loss of access.
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed font-bold tracking-wide text-right" dir="rtl">
                    تغيير كلمة مرور الحساب ممنوع منعاً باتاً. المخالفة ستؤدي إلى فقدان الوصول نهائياً.
                  </p>
                </div>
              </div>

              {/* Image side */}
              <div className="flex flex-col justify-center">
                <div className="overflow-hidden rounded-[2rem] border border-border-subtle shadow-lg bg-bg-dark p-2">
                  <img 
                    src={images.step1} 
                    alt="Step 1: Receive Details" 
                    className="w-full h-auto object-contain rounded-[1.8rem]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest text-center mt-3 italic">
                  Sample Account Credentials Layout
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: ADD ACCOUNT TO PS4 */}
        <div className="mb-16">
          <div className="p-8 md:p-12 rounded-[2.5rem] bg-bg-card border border-border-subtle hover:border-brand-red/20 transition-all shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <span className="h-12 w-12 rounded-2xl bg-brand-red/10 border border-brand-red/25 flex items-center justify-center text-brand-red font-display font-black text-xl italic">02</span>
              <div>
                <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight italic">
                  Step 2: Add the Account to Your PS4
                </h2>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest italic mt-1">الخطوة 2: إضافة الحساب إلى جهاز PS4</p>
              </div>
            </div>

            {/* Sub-step A */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-red uppercase tracking-widest italic">
                  <Monitor className="h-4 w-4" />
                  <span>Sub-step A • الخطوة الفرعية أ</span>
                </div>
                
                {showEn && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-text-primary">Follow these initial setup steps on your PS4:</p>
                    <ol className="list-decimal list-inside space-y-2 text-xs font-semibold text-text-secondary leading-relaxed uppercase tracking-wider">
                      <li>Turn on your PS4</li>
                      <li>Select <span className="text-text-primary font-black">Switch User</span></li>
                      <li>Select <span className="text-text-primary font-black">New User</span></li>
                      <li>Select <span className="text-text-primary font-black">Create a User</span></li>
                    </ol>
                  </div>
                )}

                {showAr && (
                  <div className="space-y-3 text-right" dir="rtl">
                    <p className="text-sm font-bold text-text-primary">اتبع خطوات الإعداد الأولية على جهاز PS4 الخاص بك:</p>
                    <ol className="list-decimal list-inside space-y-2 text-xs font-semibold text-text-secondary leading-relaxed">
                      <li>شغل جهاز PS4</li>
                      <li>اختر <span className="text-text-primary font-black">Switch User</span></li>
                      <li>اختر <span className="text-text-primary font-black">New User</span></li>
                      <li>اختر <span className="text-text-primary font-black">Create a User</span></li>
                    </ol>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-border-subtle bg-bg-dark p-2">
                <img 
                  src={images.step2_newuser} 
                  alt="PS4 Select New User screen" 
                  className="w-full h-auto object-contain rounded-[1.8rem]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Sub-step B */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 order-1 lg:order-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-red uppercase tracking-widest italic">
                  <Monitor className="h-4 w-4" />
                  <span>Sub-step B • الخطوة الفرعية ب</span>
                </div>

                {showEn && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-text-primary">Continue with signing in to PlayStation Network:</p>
                    <ol className="list-decimal list-inside space-y-2 text-xs font-semibold text-text-secondary leading-relaxed uppercase tracking-wider" start={5}>
                      <li>Agree to PSN terms</li>
                      <li>Select <span className="text-text-primary font-black">Sign In Manually</span></li>
                      <li>Enter the received Email and Password</li>
                      <li>Enter the 2FA verification code sent to you</li>
                    </ol>
                  </div>
                )}

                {showAr && (
                  <div className="space-y-3 text-right" dir="rtl" start={5}>
                    <p className="text-sm font-bold text-text-primary">أكمل عملية تسجيل الدخول إلى شبكة PlayStation:</p>
                    <ol className="list-decimal list-inside space-y-2 text-xs font-semibold text-text-secondary leading-relaxed">
                      <li>وافق على شروط PSN</li>
                      <li>اختر <span className="text-text-primary font-black">Sign In Manually</span></li>
                      <li>اكتب الإيميل وكلمة المرور المستلمة</li>
                      <li>اكتب كود التحقق (2FA)</li>
                    </ol>
                  </div>
                )}
              </div>

              <div className="space-y-4 order-2 lg:order-1">
                <div className="overflow-hidden rounded-[2rem] border border-border-subtle bg-bg-dark p-2">
                  <img 
                    src={images.step2_login} 
                    alt="PS4 Sign In screen" 
                    className="w-full h-auto object-contain rounded-[1.8rem]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="overflow-hidden rounded-[2rem] border border-border-subtle bg-bg-dark p-2">
                  <img 
                    src={images.step2_2fa} 
                    alt="PS4 2FA Verification Screen" 
                    className="w-full h-auto object-contain rounded-[1.8rem]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3: CHOOSE ACTIVATION TYPE */}
        <div className="mb-16">
          <div className="p-8 md:p-12 rounded-[2.5rem] bg-bg-card border border-border-subtle hover:border-brand-red/20 transition-all shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <span className="h-12 w-12 rounded-2xl bg-brand-red/10 border border-brand-red/25 flex items-center justify-center text-brand-red font-display font-black text-xl italic">03</span>
              <div>
                <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight italic">
                  Step 3: Choose Activation Type
                </h2>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest italic mt-1">الخطوة 3: اختيار نوع التفعيل</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                {/* Primary Card */}
                <div className="p-6 rounded-2xl border border-brand-red/20 bg-brand-red/5 hover:bg-brand-red/10 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-brand-red uppercase tracking-widest italic">PRIMARY TYPE • الحساب الرئيسي</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-red text-white text-[8px] font-black uppercase">Active</span>
                  </div>
                  {showEn && (
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide leading-relaxed">
                      If you purchased Primary, select: <span className="text-brand-red font-black">Change to This PS4</span>
                    </p>
                  )}
                  {showAr && (
                    <p className="text-xs font-bold text-text-primary leading-relaxed text-right mt-2" dir="rtl">
                      إذا اشتريت Primary اختر: <span className="text-brand-red font-black">Change to This PS4</span>
                    </p>
                  )}
                </div>

                {/* Secondary Card */}
                <div className="p-6 rounded-2xl border border-border-subtle bg-bg-dark hover:border-text-secondary/20 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-text-secondary uppercase tracking-widest italic">SECONDARY TYPE • الحساب الفرعي</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-bg-card text-text-secondary text-[8px] font-black uppercase">Standard</span>
                  </div>
                  {showEn && (
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wide leading-relaxed">
                      If you purchased Secondary, select: <span className="text-text-primary font-black">Do Not Change</span>
                    </p>
                  )}
                  {showAr && (
                    <p className="text-xs font-bold text-text-secondary leading-relaxed text-right mt-2" dir="rtl">
                      إذا اشتريت Secondary اختر: <span className="text-brand-red font-black">Do Not Change</span>
                    </p>
                  )}
                </div>

                {/* General Support Note */}
                <div className="flex gap-4 p-5 rounded-2xl bg-bg-dark border border-border-subtle">
                  <Info className="h-5 w-5 text-brand-red shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">
                      If you face any issues, please contact our support team.
                    </p>
                    <p className="text-xs text-text-secondary font-bold text-right" dir="rtl">
                      في حالة وجود أي مشكلة، برجاء التواصل مع الدعم.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-border-subtle bg-bg-dark p-2">
                <img 
                  src={images.step3_primary} 
                  alt="PS4 Primary Activation Settings" 
                  className="w-full h-auto object-contain rounded-[1.8rem]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
