"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Eye, EyeOff, Globe2, Home, LockKeyhole, Loader2, Mail, Search, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { A7Brand } from "@/components/brand/a7-brand";
import { useAuth, type AccountType } from "@/components/auth/auth-provider";
import { ApiError, apiUpload, apiRequest } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";
import { useLanguage } from "@/components/i18n/language-provider";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { Button } from "@/components/ui/button";

type AuthMode = "sign-in" | "create";
type AuthStep = "role" | "email" | "password" | "reset" | "identification";

const copy = {
  en: {
    back: "Back to home",
    language: "English",
    welcome: "Welcome back",
    createTitle: "Create your account",
    subtitle: "Sign in to continue your home search.",
    createSubtitle: "Save homes, message owners, and manage viewings in one place.",
    roleTitle: "How would you like to use A7?",
    roleSubtitle: "Choose a type for a new account. Existing accounts keep their registered type.",
    seekerTitle: "I'm looking for a home",
    seekerDesc: "Search, save, and contact property owners.",
    listerTitle: "I want to list properties",
    listerDesc: "Post listings, manage inquiries, and track performance.",
    seeker: "Home seeker",
    lister: "Property lister",
    continueRole: "Continue",
    email: "Email address",
    fullName: "Full name",
    fullNamePlaceholder: "Enter your name",
    placeholder: "Enter your email",
    invalidEmail: "Enter a valid email address.",
    continue: "Continue",
    create: "Create account",
    password: "Password",
    confirmPassword: "Confirm password",
    serverPasswordHint: "Use at least 12 characters, with letters and numbers.",
    serverInvalidPassword: "Password must be at least 12 characters and contain letters and numbers.",
    mismatch: "Passwords do not match.",
    forgot: "Forgot password?",
    resetTitle: "Reset your password",
    resetSubtitle: "We’ll send a secure reset link to your email.",
    sendReset: "Send reset link",
    backToSignIn: "Back to sign in",
    signInButton: "Sign in",
    noAccount: "Don’t have an account?",
    hasAccount: "Already have an account?",
    createAccount: "Create account",
    signIn: "Sign in",
    legalStart: "By continuing, you agree to our",
    terms: "Terms of Use",
    and: "and",
    privacy: "Privacy Policy.",
    imageEyebrow: "A7 PROPERTY",
    imageTitle: "Your next home starts here.",
    imageBody: "Explore listings with visible verification status and direct inquiry tools across Myanmar.",
    trust: "Visible status · Clear prices · Direct inquiry",
    serverNotice: "Your account is created on the A7 Property server. Confirm your email to publish listings, send inquiries and request viewings.",
    signInFailed: "That email and password combination is not correct.",
    emailTaken: "An account already uses this email address. Sign in instead.",
    lockedOut: "Too many failed attempts. Please wait before trying again.",
    rateLimited: "Too many requests. Please wait a minute and try again.",
    genericError: "Something went wrong. Please try again.",
    verifySent: "Check your inbox for a confirmation link.",
    verifyNotSent: "Your account was created, but the confirmation email could not be sent. You can request a new one later.",
    socialUnavailable: "Social sign-in is not available. Use your email address and password.",
    resetSent: "If an account uses that address, a reset link is on its way.",
    noApiNotice: "This build has no API configured, so accounts cannot be created or signed in here. Set NEXT_PUBLIC_API_URL to connect the A7 Property server.",
    changeEmail: "Change email",
    showPassword: "Show password",
    hidePassword: "Hide password",
    uploadIdTitle: "Verify your identity",
    uploadIdSubtitle: "Please upload your national ID or passport to list properties.",
    selectFile: "Select a document",
    finish: "Submit & Finish",
    uploading: "Uploading...",
  },
  my: {
    back: "ပင်မစာမျက်နှာသို့",
    language: "မြန်မာ",
    welcome: "ပြန်လည်ကြိုဆိုပါတယ်",
    createTitle: "အကောင့်ဖွင့်ပါ",
    subtitle: "အိမ်ရှာဖွေမှုကို ဆက်လုပ်ရန် အကောင့်ဝင်ပါ။",
    createSubtitle: "အိမ်များသိမ်းရန်၊ ပိုင်ရှင်များနှင့် ဆက်သွယ်ရန်နှင့် ကြည့်ရှုချိန်များ စီမံရန် အကောင့်ဖွင့်ပါ။",
    roleTitle: "A7 ကို ဘယ်လို အသုံးပြုချင်ပါသလဲ?",
    roleSubtitle: "အကောင့်သစ်အတွက် အမျိုးအစားရွေးပါ။ ရှိပြီးသားအကောင့်၏ အမျိုးအစား မပြောင်းပါ။",
    seekerTitle: "အိမ်ရှာဖွေချင်ပါသည်",
    seekerDesc: "ရှာဖွေခြင်း၊ သိမ်းဆည်းခြင်း၊ ပိုင်ရှင်များနှင့် ဆက်သွယ်ခြင်း။",
    listerTitle: "အိမ်များ တင်ချင်ပါသည်",
    listerDesc: "အိမ်များတင်ခြင်း၊ မေးခွန်းများ စီမံခြင်း၊ စာရင်းအင်း ကြည့်ခြင်း။",
    seeker: "အိမ်ရှာသူ",
    lister: "အိမ်တင်သူ",
    continueRole: "ဆက်လုပ်မည်",
    email: "အီးမေးလ်လိပ်စာ",
    fullName: "အမည်",
    fullNamePlaceholder: "သင့်အမည် ရိုက်ထည့်ပါ",
    placeholder: "အီးမေးလ် ရိုက်ထည့်ပါ",
    invalidEmail: "မှန်ကန်သော အီးမေးလ်လိပ်စာ ရိုက်ထည့်ပါ။",
    continue: "ဆက်လုပ်မည်",
    create: "အကောင့်ဖွင့်မည်",
    password: "စကားဝှက်",
    confirmPassword: "စကားဝှက် အတည်ပြုပါ",
    serverPasswordHint: "အနည်းဆုံး စာလုံး ၁၂ လုံး၊ အက္ခရာနှင့် နံပါတ် ပါဝင်ရမည်။",
    serverInvalidPassword: "စကားဝှက်သည် အနည်းဆုံး စာလုံး ၁၂ လုံးရှိပြီး အက္ခရာနှင့် နံပါတ် ပါဝင်ရပါမည်။",
    mismatch: "စကားဝှက်များ မတူညီပါ။",
    forgot: "စကားဝှက် မေ့နေပါသလား?",
    resetTitle: "စကားဝှက် ပြန်သတ်မှတ်ပါ",
    resetSubtitle: "လုံခြုံသော reset link ကို သင့်အီးမေးလ်သို့ ပို့ပါမည်။",
    sendReset: "Reset link ပို့မည်",
    backToSignIn: "အကောင့်ဝင်ရန် ပြန်သွားမည်",
    signInButton: "အကောင့်ဝင်မည်",
    noAccount: "အကောင့်မရှိသေးပါသလား?",
    hasAccount: "အကောင့်ရှိပြီးသားလား?",
    createAccount: "အကောင့်ဖွင့်ပါ",
    signIn: "အကောင့်ဝင်ပါ",
    legalStart: "ဆက်လုပ်ခြင်းဖြင့် ကျွန်ုပ်တို့၏",
    terms: "အသုံးပြုမှု စည်းမျဉ်းများ",
    and: "နှင့်",
    privacy: "ကိုယ်ရေးအချက်အလက် မူဝါဒကို သဘောတူပါသည်။",
    imageEyebrow: "A7 PROPERTY",
    imageTitle: "သင့်အိမ်အသစ်ကို ဒီနေရာက စတင်ရှာပါ။",
    imageBody: "မြန်မာနိုင်ငံအနှံ့ စိစစ်မှုအခြေအနေမြင်သာသော အိမ်များကို ရှာဖွေပြီး တိုက်ရိုက်မေးမြန်းပါ။",
    trust: "မြင်သာသောအခြေအနေ · ရှင်းလင်းသောဈေးနှုန်း · တိုက်ရိုက်မေးမြန်းမှု",
    serverNotice: "သင့်အကောင့်ကို A7 Property server ပေါ်တွင် ဖန်တီးပါမည်။ ကြော်ငြာတင်ခြင်း၊ စုံစမ်းမေးမြန်းခြင်းနှင့် အိမ်လာကြည့်ရန် တောင်းဆိုခြင်းအတွက် အီးမေးလ်ကို အတည်ပြုပါ။",
    signInFailed: "အီးမေးလ်နှင့် စကားဝှက် မကိုက်ညီပါ။",
    emailTaken: "ဤအီးမေးလ်လိပ်စာဖြင့် အကောင့်ရှိပြီးသားဖြစ်ပါသည်။ အကောင့်ဝင်ပါ။",
    lockedOut: "မအောင်မြင်သော ကြိုးစားမှု အလွန်များပါသည်။ ခဏစောင့်ပြီး ထပ်မံကြိုးစားပါ။",
    rateLimited: "တောင်းဆိုမှု အလွန်များပါသည်။ ခဏစောင့်ပြီး ထပ်မံကြိုးစားပါ။",
    genericError: "အမှားတစ်ခု ဖြစ်ပွားပါသည်။ ထပ်မံကြိုးစားပါ။",
    verifySent: "အတည်ပြုလင့်ခ်အတွက် သင့်အီးမေးလ်ကို စစ်ဆေးပါ။",
    verifyNotSent: "အကောင့်ကို ဖန်တီးပြီးပါပြီ၊ သို့သော် အတည်ပြုအီးမေးလ် ပေးပို့နိုင်ခြင်း မရှိပါ။ နောက်မှ အသစ်တောင်းဆိုနိုင်ပါသည်။",
    socialUnavailable: "ပြင်ပအကောင့်ဖြင့် ဝင်ရောက်မှု မရရှိနိုင်ပါ။ အီးမေးလ်နှင့် စကားဝှက် အသုံးပြုပါ။",
    resetSent: "ထိုလိပ်စာကို အသုံးပြုသော အကောင့်ရှိပါက ပြန်သတ်မှတ်လင့်ခ်ကို ပေးပို့လိုက်ပါပြီ။",
    noApiNotice: "ဤ build တွင် API မသတ်မှတ်ထားသဖြင့် အကောင့်ဖွင့်ခြင်း သို့မဟုတ် အကောင့်ဝင်ခြင်း မလုပ်ဆောင်နိုင်ပါ။ A7 Property server ချိတ်ဆက်ရန် NEXT_PUBLIC_API_URL သတ်မှတ်ပါ။",
    changeEmail: "အီးမေးလ်ပြောင်းရန်",
    showPassword: "စကားဝှက်ပြရန်",
    hidePassword: "စကားဝှက်ဖျောက်ရန်",
    uploadIdTitle: "အထောက်အထားကို စိစစ်ပါ",
    uploadIdSubtitle: "အိမ်များတင်ရန် မှတ်ပုံတင် သို့မဟုတ် နိုင်ငံကူးလက်မှတ် တင်ပေးပါ။",
    selectFile: "စာရွက်စာတမ်း ရွေးချယ်ပါ",
    finish: "တင်သွင်းပြီး အဆုံးသတ်မည်",
    uploading: "တင်နေသည်...",
  },
} as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server mode must match the backend rule exactly (12+ characters containing
// letters and numbers) so a valid-looking password is never rejected after
// submission.
const serverPasswordLength = 12;
const serverPasswordPattern = /^(?=.*[A-Za-z])(?=.*\d).+$/;

function RoleOption({ selected, onSelect, icon, title, desc, label, reduceMotion }: { selected: boolean; onSelect: () => void; icon: React.ReactNode; title: string; desc: string; label: string; reduceMotion: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={false}
      animate={{ scale: selected ? 1.01 : 1 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-[border-color,box-shadow,background-color] ${selected ? "border-[#123B73] bg-[#DCEBFF] shadow-[0_0_0_4px_rgba(18,59,115,.08)]" : "border-[#E1E6ED] bg-[#F8FBFF] hover:border-[#B7C2D0]"}`}
      aria-pressed={selected}
    >
      <motion.span
        animate={{ rotate: selected ? 0 : 0, scale: selected ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${selected ? "bg-[#123B73] text-white" : "bg-[#DCEBFF] text-[#123B73]"}`}
      >{icon}</motion.span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[14px] font-semibold text-[#101828]">{title}</strong>
        <span className="mt-1 block text-[12px] leading-5 text-[#687385]">{desc}</span>
        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${selected ? "bg-[#123B73] text-white" : "bg-[#DCEBFF] text-[#59616A]"}`}>{label}</span>
      </span>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#123B73]" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function SignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as AuthMode) || "sign-in";
  const { mode: authMode, signInWithPassword, signUpWithPassword } = useAuth();
  const serverBacked = authMode === "server";
  const { language, setLanguage } = useLanguage();
  const reduceMotion = useReducedMotion() ?? false;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>("role");
  const [accountType, setAccountType] = useState<AccountType>(searchParams.get("role") === "lister" ? "lister" : "seeker");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [identificationFiles, setIdentificationFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const text = copy[language];
  const [errorMessage, setErrorMessage] = useState("");
  const hasError = touched && !emailPattern.test(email);

  const passwordTooWeak = password.length < serverPasswordLength || !serverPasswordPattern.test(password);
  // A weak password only blocks account creation. Sign-in must send whatever the
  // user typed: an existing account may predate a stricter rule, and the server
  // decides. Rejecting it here would lock people out of their own accounts.
  const passwordRuleApplies = mode === "create";
  const passwordError = touched && step === "password" && passwordRuleApplies && passwordTooWeak
    ? text.serverInvalidPassword
    : touched && step === "password" && mode === "create" && password !== confirmPassword
      ? text.mismatch
      : "";

  /** Turns a backend failure into copy that does not leak whether an account exists. */
  function describeApiError(error: unknown) {
    if (!(error instanceof ApiError)) return text.genericError;
    if (error.isRateLimited) return text.rateLimited;
    if (error.status === 409) return text.emailTaken;
    if (error.status === 401) return text.signInFailed;
    if (error.status === 403) return text.lockedOut;
    if (error.status === 400 && error.fieldMessages.length) return error.fieldMessages.join(" ");
    return text.genericError;
  }

  function goToNextScreen(resolvedAccountType: AccountType) {
    const returnTo = window.sessionStorage.getItem("a7-auth-return-to");
    window.sessionStorage.removeItem("a7-auth-return-to");

    if (resolvedAccountType === "admin") {
      router.push(returnTo || "/admin");
    } else if (resolvedAccountType === "lister") {
      router.push(returnTo || "/owner");
    } else {
      router.push(returnTo || "/dashboard");
    }
  }

  async function submitToServer() {
    setSubmitting(true);
    setErrorMessage("");
    try {
      if (mode === "create") {
        const result = await signUpWithPassword({
          email: email.trim(),
          password,
          fullName: fullName.trim() || email.trim().split("@")[0] || "User",
          accountType,
        });
        setNotice(result.verificationEmailSent ? text.verifySent : text.verifyNotSent);

        if (accountType === "lister") {
          setStep("identification");
          setSubmitting(false);
          return;
        }

        goToNextScreen(result.user.accountType);
        return;
      }
      const signedIn = await signInWithPassword(email.trim(), password);
      // The server owns the role, so navigate by what it returned, not by the
      // role chosen on the first step.
      goToNextScreen(signedIn.accountType);
    } catch (error) {
      setErrorMessage(describeApiError(error));
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setErrorMessage("");
    if (!serverBacked) return;
    if (step === "reset") {
      if (!emailPattern.test(email)) return;
      setTouched(false);
      void (async () => {
        try {
          await authApi.forgotPassword(email.trim());
          // The same message either way: the response must not reveal whether
          // the address has an account.
          setNotice(text.resetSent);
        } catch (error) {
          setErrorMessage(describeApiError(error));
        }
      })();
      return;
    }
    if (step === "role") {
      setStep("email");
      setTouched(false);
      setNotice("");
      return;
    }
    if (!emailPattern.test(email)) return;
    if (step === "email") {
      setStep("password");
      setTouched(false);
      setNotice("");
      return;
    }
    if (mode === "create" && (passwordTooWeak || password !== confirmPassword)) return;
    if (!password) return;

    if (step === "identification") {
      void submitIdentification();
      return;
    }

    void submitToServer();
  }

  async function submitIdentification() {
    if (identificationFiles.length === 0) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      for (const file of identificationFiles) {
        const uploadRes = await apiUpload<{ id: string, url: string }>("/uploads/identification", file);
        await apiRequest("/users/me/verification-document", {
          method: "POST",
          body: {
            documentUrl: uploadRes.url,
            documentAssetId: uploadRes.id,
            documentType: "NATIONAL_ID",
          }
        });
      }
      goToNextScreen("lister");
    } catch (error) {
      setErrorMessage(describeApiError(error));
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage("");
    setStep("role");
    setTouched(false);
    setPassword("");
    setConfirmPassword("");
    setEmail("");
    setFullName("");
    setNotice("");
  }

  return (
    <main className="min-h-svh bg-[#F8FBFF] p-0 lg:p-3" lang={language === "my" ? "my" : "en"}>
      <div className="mx-auto grid min-h-svh max-w-[1720px] overflow-hidden bg-[#F8FBFF] shadow-[0_24px_80px_rgba(16,35,61,.12)] lg:min-h-[calc(100svh-24px)] lg:grid-cols-[minmax(430px,36%)_1fr] lg:rounded-[28px] lg:border lg:border-[#E3E8EF]">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 order-2 -mt-7 flex min-h-[calc(100svh-165px)] flex-col rounded-t-[28px] bg-[#F8FBFF] px-5 pb-7 pt-6 sm:px-9 lg:order-1 lg:mt-0 lg:min-h-0 lg:rounded-none lg:px-[clamp(44px,5vw,86px)] lg:py-10"
        >
          <div className="flex items-center justify-between">
            <Link href="/" aria-label={text.back} className="rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20">
              <A7Brand />
            </Link>
            <Link href="/" className="grid size-11 place-items-center rounded-full border border-[#DCE2EA] text-[#596473] transition-colors hover:bg-[#EAF4FF] lg:hidden" aria-label={text.back}>
              <ArrowLeft className="size-[18px]" />
            </Link>
          </div>

          <div className="my-auto w-full max-w-[430px] self-center py-10 lg:py-12">
            <motion.div
              key={`${mode}-${language}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
            >
              <AnimatedAssetIcon src="/icons/a7-account-access-3d.png" width={64} height={64} hover="float" className="mb-4 size-14 sm:size-16" />
              <h1 className="text-[32px] font-semibold tracking-[-0.045em] text-[#101828] sm:text-[36px]">
                {step === "identification" ? text.uploadIdTitle : step === "reset" ? text.resetTitle : step === "role" ? text.roleTitle : mode === "sign-in" ? text.welcome : text.createTitle}
              </h1>
              <p className="mt-2.5 max-w-[390px] text-[15px] leading-6 text-[#687385]">
                {step === "identification" ? text.uploadIdSubtitle : step === "reset" ? text.resetSubtitle : step === "role" ? text.roleSubtitle : step === "password" ? email : mode === "sign-in" ? text.subtitle : text.createSubtitle}
              </p>
            </motion.div>

            <form className="mt-9" onSubmit={handleSubmit} noValidate>
              <p className="mb-5 rounded-xl border border-[#B9D8FF] bg-[#EEF6FF] px-4 py-3 text-[11px] leading-5 text-[#244B76]">
                {serverBacked ? text.serverNotice : text.noApiNotice}
              </p>
              {serverBacked && (
              <AnimatePresence>
              {step === "role" && (
                <motion.div key="role-step" initial={reduceMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="space-y-3">
                  <RoleOption
                    selected={accountType === "seeker"}
                    onSelect={() => setAccountType("seeker")}
                    icon={<Search className="size-5" />}
                    title={text.seekerTitle}
                    desc={text.seekerDesc}
                    label={text.seeker}
                    reduceMotion={reduceMotion}
                  />
                  <RoleOption
                    selected={accountType === "lister"}
                    onSelect={() => setAccountType("lister")}
                    icon={<Tag className="size-5" />}
                    title={text.listerTitle}
                    desc={text.listerDesc}
                    label={text.lister}
                    reduceMotion={reduceMotion}
                  />
                  <Button type="submit" className="mt-4 h-[54px] w-full rounded-xl text-[15px] shadow-[0_10px_24px_rgba(18,59,115,.22)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(18,59,115,.28)]">
                    {text.continueRole}
                    <ArrowRight className="size-[18px]" aria-hidden="true" />
                  </Button>
                </motion.div>
              )}

              {(step === "email" || step === "reset") && (
                <motion.div key="email-step" initial={reduceMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                  <label htmlFor="email" className="text-[13px] font-semibold text-[#101828]">{text.email}</label>
                  <div className={`mt-2 flex h-[54px] items-center gap-3 rounded-xl border bg-[#F8FBFF] px-4 transition-[border-color,box-shadow] ${hasError ? "border-[#D92D20] shadow-[0_0_0_3px_rgba(217,45,32,.10)]" : "border-[#CCD4DE] focus-within:border-[#123B73] focus-within:shadow-[0_0_0_4px_rgba(18,59,115,.12)]"}`}>
                    <Mail className={`size-5 shrink-0 ${hasError ? "text-[#D92D20]" : "text-[#7B8798]"}`} aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      data-focus-ring="parent"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder={text.placeholder}
                      aria-invalid={hasError}
                      aria-describedby={hasError ? "email-error" : undefined}
                      className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[15px] text-[#101828] outline-none ring-0 placeholder:text-[#9AA3B1] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="min-h-6 pt-1.5">
                    {hasError && <p id="email-error" className="text-xs text-[#C4322B]" role="alert">{text.invalidEmail}</p>}
                  </div>
                </motion.div>
              )}

              {step === "email" && mode === "create" && (
                <div key="registration-name">
                  <label htmlFor="full-name" className="text-[13px] font-semibold text-[#101828]">{text.fullName || "Full name"}</label>
                  <div className="mt-2 mb-3 flex h-[54px] items-center gap-3 rounded-xl border border-[#CCD4DE] bg-[#F8FBFF] px-4 focus-within:border-[#123B73] focus-within:shadow-[0_0_0_4px_rgba(18,59,115,.12)]">
                    <Home className="size-5 shrink-0 text-[#7B8798]" aria-hidden="true" />
                    <input
                      id="full-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder={text.fullNamePlaceholder || "Enter your name"}
                      className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[15px] text-[#101828] outline-none ring-0 placeholder:text-[#9AA3B1] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {step === "password" && (
                <motion.div key="password-step" initial={reduceMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                  <button type="button" onClick={() => { setStep("email"); setTouched(false); setNotice(""); }} className="mb-5 inline-flex min-h-11 items-center gap-1 text-[12px] font-semibold text-[#123B73]"><ArrowLeft className="size-4" />{text.changeEmail}</button>
                  <label htmlFor="password" className="text-[13px] font-semibold text-[#101828]">{text.password}</label>
                  <div className={`mt-2 flex h-[54px] items-center gap-3 rounded-xl border bg-[#F8FBFF] px-4 ${passwordError ? "border-[#D92D20]" : "border-[#CCD4DE] focus-within:border-[#123B73] focus-within:shadow-[0_0_0_4px_rgba(18,59,115,.12)]"}`}>
                    <LockKeyhole className="size-5 shrink-0 text-[#7B8798]" />
                    <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "create" ? "new-password" : "current-password"} className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid size-11 place-items-center rounded-full text-[#7B8798] hover:bg-[#F8FBFF]" aria-label={showPassword ? text.hidePassword : text.showPassword}>{showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}</button>
                  </div>
                  {mode === "create" && (
                    <>
                      <label htmlFor="confirm-password" className="mt-4 block text-[13px] font-semibold text-[#101828]">{text.confirmPassword}</label>
                      <div className="mt-2 flex h-[54px] items-center gap-3 rounded-xl border border-[#CCD4DE] bg-[#F8FBFF] px-4 focus-within:border-[#123B73] focus-within:shadow-[0_0_0_4px_rgba(18,59,115,.12)]">
                        <LockKeyhole className="size-5 shrink-0 text-[#7B8798]" />
                        <input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
                      </div>
                    </>
                  )}
                  <div className="flex min-h-9 items-start justify-between gap-3 pt-2">
                    <p className={`text-xs ${passwordError ? "text-[#C4322B]" : "text-[#8A93A1]"}`} role={passwordError ? "alert" : undefined}>{passwordError || text.serverPasswordHint}</p>
                    {mode === "sign-in" && <button type="button" onClick={() => { setStep("reset"); setTouched(false); setNotice(""); }} className="shrink-0 text-xs font-semibold text-[#123B73] hover:underline">{text.forgot}</button>}
                  </div>
                </motion.div>
              )}

              {step === "identification" && (
                <motion.div key="id-step" initial={reduceMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="mt-2 flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-44 border-2 border-[#CCD4DE] border-dashed rounded-xl cursor-pointer bg-[#F8FBFF] hover:bg-gray-50 focus-within:border-[#123B73] focus-within:shadow-[0_0_0_4px_rgba(18,59,115,.12)]">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Tag className="w-8 h-8 mb-4 text-[#7B8798]" />
                            <p className="mb-2 text-sm text-[#687385]"><span className="font-semibold">{text.selectFile}</span></p>
                            <p className="text-xs text-[#9AA3B1] px-4 text-center">JPEG, PNG, WEBP (Max 2 files, 10MB each)</p>
                        </div>
                        <input id="dropzone-file" type="file" multiple accept="image/jpeg, image/png, image/webp" className="hidden" onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 2) {
                            setErrorMessage(language === "my" ? "အထောက်အထား ၂ ခုအထိသာ တင်နိုင်ပါသည်။" : "You can only upload up to 2 documents.");
                            return;
                          }
                          setErrorMessage("");
                          setIdentificationFiles(files);
                        }} />
                    </label>
                  </div>
                  {identificationFiles.map((file, idx) => (
                    <div key={idx} className="mt-3 text-sm text-[#123B73] flex items-center justify-between rounded-xl bg-[#DCEBFF] px-4 py-3">
                      <span className="truncate">{file.name}</span>
                      <CheckCircle2 className="size-4 shrink-0" />
                    </div>
                  ))}
                </motion.div>
              )}

              {errorMessage && <div key="form-error" role="alert" className="mb-4 rounded-xl border border-[#F3B9B9] bg-[#FEF3F2] px-4 py-3 text-xs leading-5 text-[#9A2A2A]">{errorMessage}</div>}
              {notice && <div key="form-notice" role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-[#DCEBFF] px-4 py-3 text-xs text-[#27714D]"><CheckCircle2 className="size-4" />{notice}</div>}

              {step !== "role" && (
                <motion.div key="submit-action" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={step === "identification" ? "mt-5" : ""}>
                <Button type="submit" disabled={(!email.trim() && step !== "identification") || submitting || (step === "password" && (password.length < 8 || (mode === "create" && password !== confirmPassword))) || (step === "identification" && identificationFiles.length === 0)} className="h-[54px] w-full rounded-xl text-[15px] shadow-[0_10px_24px_rgba(18,59,115,.22)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(18,59,115,.28)]">
                  {submitting ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : <ArrowRight className="size-[18px]" aria-hidden="true" />}
                  {step === "reset" ? text.sendReset : step === "identification" ? text.finish : step === "password" ? (mode === "sign-in" ? text.signInButton : text.create) : text.continue}
                </Button>
                </motion.div>
              )}
              {step === "reset" && <button key="reset-back" type="button" onClick={() => { setStep("email"); setNotice(""); setTouched(false); }} className="mt-4 w-full text-center text-xs font-semibold text-[#123B73]">{text.backToSignIn}</button>}
              </AnimatePresence>
              )}
            </form>

            {step === "email" && <p className="mt-8 text-center text-[13px] text-[#737E8E]">
              {mode === "sign-in" ? text.noAccount : text.hasAccount}{" "}
              <button type="button" onClick={() => changeMode(mode === "sign-in" ? "create" : "sign-in")} className="font-semibold text-[#123B73] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123B73]/25">
                {mode === "sign-in" ? text.createAccount : text.signIn}
              </button>
            </p>}
          </div>

          <p className="mx-auto max-w-[430px] text-center text-[11px] leading-5 text-[#838D9C]">
            {text.legalStart}{" "}
            <Link href="/terms" className="font-medium text-[#123B73] hover:underline">{text.terms}</Link>{" "}
            {text.and}{" "}
            <Link href="/privacy" className="font-medium text-[#123B73] hover:underline">{text.privacy}</Link>
          </p>
        </motion.section>

        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, scale: 1.025 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative order-1 h-[192px] overflow-hidden bg-[#D8E2E8] lg:order-2 lg:h-auto"
          aria-label={language === "my" ? "နွေးထွေးပြီး အလင်းရောင်ကောင်းသော အိမ်အတွင်းပိုင်း" : "A warm, light-filled home interior"}
        >
          <Image
            src="/images/properties/warm-living-room.jpg"
            alt={language === "my" ? "ခေတ်မီမြန်မာအိမ်၏ နေရောင်ရသော ဧည့်ခန်း" : "Warm, sunlit living room in a modern Myanmar home"}
            fill
            loading="eager"
            sizes="(min-width: 1024px) 64vw, 100vw"
            className="object-cover object-[50%_52%] lg:object-[48%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101828]/45 via-transparent to-[#101828]/10 lg:from-[#101828]/52" />

          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "my" : "en")}
            className="absolute right-4 top-4 flex h-11 items-center gap-2.5 rounded-xl border border-white/60 bg-[#F8FBFF]/92 px-3.5 text-[12px] font-medium text-[#101828] shadow-[0_8px_24px_rgba(15,27,44,.14)] backdrop-blur-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 lg:right-8 lg:top-8 lg:h-12 lg:px-4 lg:text-[13px]"
            aria-label={language === "en" ? "မြန်မာဘာသာသို့ ပြောင်းရန်" : "Switch to English"}
          >
            <Globe2 className="size-[18px]" aria-hidden="true" />
            {text.language}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-6 bottom-6 hidden max-w-[540px] text-white lg:block lg:inset-x-10 lg:bottom-10 xl:left-14 xl:bottom-14">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/76">{text.imageEyebrow}</p>
            <h2 className="mt-3 text-[clamp(30px,3vw,52px)] font-semibold leading-[1.03] tracking-[-0.05em] text-white">{text.imageTitle}</h2>
            <p className="mt-4 max-w-[500px] text-[14px] leading-6 text-white/84">{text.imageBody}</p>
            <div className="mt-6 inline-flex rounded-full border border-white/22 bg-[#101828]/28 px-4 py-2 text-[11px] font-medium text-white/90 backdrop-blur-md">{text.trust}</div>
          </div>
        </motion.aside>
      </div>
    </main>
  );
}

export { SignInView };
