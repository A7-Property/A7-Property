import { InformationPage } from "@/components/content/information-page";

export default function HelpPage() {
  return (
    <InformationPage
      eyebrow={{ en: "A7 Property help center", my: "A7 Property အကူအညီဌာန" }}
      title={{ en: "Help for every step toward home.", my: "အိမ်တစ်လုံးရရှိရန် ခြေလှမ်းတိုင်းအတွက် အကူအညီ။" }}
      intro={{ en: "Quick guidance for searching, saving, contacting owners, arranging viewings, and keeping your account safe.", my: "အိမ်ရှာခြင်း၊ သိမ်းထားခြင်း၊ ပိုင်ရှင်နှင့်ဆက်သွယ်ခြင်း၊ အိမ်ကြည့်ရန်စီစဉ်ခြင်းနှင့် account လုံခြုံရေးအတွက် လမ်းညွှန်ချက်များ။" }}
      helpMode
      visualSrc="/icons/a7-help-center-3d.png"
      updated={{ en: "Available throughout your local A7 experience", my: "သင့်စက်ပေါ်ရှိ A7 အတွေ့အကြုံတစ်လျှောက် ရရှိနိုင်သည်" }}
      sections={[
        { title: { en: "Search and filters", my: "ရှာဖွေမှုနှင့် စစ်ထုတ်မှု" }, body: { en: "Choose Rent, Buy, or Sell from navigation, enter a township or landmark, then refine by price, home type, bedrooms, bathrooms, and verification.", my: "Navigation မှ ငှားရန်၊ ဝယ်ရန် သို့မဟုတ် ရောင်းရန်ကို ရွေးပြီး မြို့နယ် သို့မဟုတ် အထင်ကရနေရာ ထည့်ပါ။ ထို့နောက် ဈေးနှုန်း၊ အိမ်အမျိုးအစား၊ အိပ်ခန်း၊ ရေချိုးခန်းနှင့် စိစစ်မှုအလိုက် ရွေးချယ်ပါ။" } },
        { title: { en: "Saved homes", my: "သိမ်းထားသောအိမ်များ" }, body: { en: "Use the heart button on any property card or detail page. Your saved count updates immediately and your shortlist appears in My Home Journey.", my: "အိမ်ကတ် သို့မဟုတ် အသေးစိတ်စာမျက်နှာရှိ နှလုံးပုံခလုတ်ကို သုံးပါ။ သိမ်းထားသောအရေအတွက် ချက်ချင်းပြောင်းပြီး My Home Journey တွင် တွေ့ရပါမည်။" } },
        { title: { en: "Messages and viewings", my: "စာများနှင့် အိမ်ကြည့်ချိန်" }, body: { en: "Open a property, contact its owner, or request a viewing. New requests appear in your dashboard conversations and upcoming viewings.", my: "အိမ်အသေးစိတ်ကိုဖွင့်ပြီး ပိုင်ရှင်ကို ဆက်သွယ်ပါ သို့မဟုတ် အိမ်ကြည့်ရန် တောင်းဆိုပါ။ တောင်းဆိုချက်အသစ်များကို dashboard စကားပြောဆိုမှုနှင့် လာမည့်အိမ်ကြည့်ချိန်များတွင် တွေ့ရပါမည်။" } },
        { title: { en: "Safety", my: "လုံခြုံရေး" }, body: { en: "Never feel pressured to pay before verifying the property and agreement. Report concerns from Profile → Help → Report a safety concern.", my: "အိမ်နှင့် သဘောတူစာချုပ်ကို စိစစ်မပြီးမီ ငွေပေးရန် ဖိအားကို လက်မခံပါနှင့်။ Profile → Help မှ လုံခြုံရေးစိုးရိမ်ချက်ကို တိုင်ကြားနိုင်ပါသည်။" } },
      ]}
    />
  );
}
