import { InformationPage } from "@/components/content/information-page";

export default function TermsPage() {
  return (
    <InformationPage
      eyebrow={{ en: "A7 Property legal", my: "A7 Property အသုံးပြုမှုစည်းမျဉ်း" }}
      title={{ en: "Terms designed for a fair home journey.", my: "မျှတသော အိမ်ရှာခရီးအတွက် အသုံးပြုမှုစည်းမျဉ်းများ။" }}
      intro={{ en: "These terms explain how home seekers, owners, and agents can use A7 Property responsibly.", my: "အိမ်ရှာသူ၊ ပိုင်ရှင်နှင့် အကျိုးဆောင်များ A7 Property ကို တာဝန်သိစွာ အသုံးပြုပုံကို ဤစည်းမျဉ်းများတွင် ရှင်းပြထားပါသည်။" }}
      visualSrc="/icons/a7-terms-3d.png"
      sections={[
        { title: { en: "Using A7 Property", my: "A7 Property အသုံးပြုခြင်း" }, body: { en: "Use accurate information, respect other people, and use the marketplace only for genuine property journeys.", my: "မှန်ကန်သောအချက်အလက်ကို အသုံးပြုပါ၊ အခြားသူများကို လေးစားပါ၊ marketplace ကို အမှန်တကယ် အိမ်ခြံမြေလိုအပ်ချက်အတွက်သာ အသုံးပြုပါ။" }, points: [
          { en: "Do not impersonate another person.", my: "အခြားသူတစ်ဦးအဖြစ် အယောင်ဆောင်ခြင်း မပြုပါနှင့်။" },
          { en: "Do not post misleading prices or unavailable homes.", my: "လှည့်ဖြားသောဈေးနှုန်း သို့မဟုတ် မရရှိနိုင်သောအိမ်များ မတင်ပါနှင့်။" },
          { en: "Keep conversations respectful and property-focused.", my: "စကားပြောဆိုမှုကို လေးစားမှုရှိပြီး အိမ်ခြံမြေအကြောင်းအရာပေါ်သာ အာရုံစိုက်ပါ။" },
        ] },
        { title: { en: "Listings and verification", my: "ကြော်ငြာနှင့် စိစစ်မှု" }, body: { en: "Verification improves trust but does not replace your own inspection, legal review, or ownership checks before making a payment.", my: "စိစစ်မှုက ယုံကြည်မှုကို တိုးစေသော်လည်း ငွေမပေးမီ သင်ကိုယ်တိုင် အိမ်စစ်ဆေးခြင်း၊ ဥပဒေဆိုင်ရာသုံးသပ်ခြင်းနှင့် ပိုင်ဆိုင်မှုစစ်ဆေးခြင်းတို့ကို အစားမထိုးပါ။" } },
        { title: { en: "Payments and agreements", my: "ငွေပေးချေမှုနှင့် သဘောတူညီချက်" }, body: { en: "A7 Property does not ask home seekers to transfer deposits inside this frontend experience. Any agreement should be reviewed carefully and documented.", my: "ဤ frontend demo အတွင်း A7 Property က အိမ်ရှာသူများကို စပေါ်ငွေလွှဲရန် မတောင်းဆိုပါ။ သဘောတူညီချက်တိုင်းကို သေချာစစ်ဆေးပြီး မှတ်တမ်းတင်ထားသင့်ပါသည်။" } },
        { title: { en: "Account safety", my: "Account လုံခြုံရေး" }, body: { en: "You are responsible for keeping your sign-in details private and reporting suspicious activity quickly through the Help Center.", my: "သင့် sign-in အချက်အလက်ကို လုံခြုံစွာ ထိန်းသိမ်းရန်နှင့် သံသယဖြစ်ဖွယ်လုပ်ဆောင်မှုကို Help Center မှ အမြန်တိုင်ကြားရန် သင်တာဝန်ရှိပါသည်။" } },
      ]}
    />
  );
}
