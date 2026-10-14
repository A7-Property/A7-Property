import { InformationPage } from "@/components/content/information-page";

export default function PrivacyPage() {
  return (
    <InformationPage
      eyebrow={{ en: "A7 Property privacy", my: "A7 Property ကိုယ်ရေးလုံခြုံမှု" }}
      title={{ en: "Your home search should stay personal.", my: "သင့်အိမ်ရှာဖွေမှုဟာ သင့်ကိုယ်ရေးအဖြစ် လုံခြုံနေသင့်ပါတယ်။" }}
      intro={{ en: "This policy explains what information A7 uses to power saved homes, recommendations, messages, and viewing requests.", my: "သိမ်းထားသောအိမ်၊ အကြံပြုချက်၊ စာများနှင့် အိမ်ကြည့်ရန်တောင်းဆိုချက်များအတွက် A7 က မည်သည့်အချက်အလက်များ အသုံးပြုသည်ကို ဤမူဝါဒတွင် ရှင်းပြထားပါသည်။" }}
      visualSrc="/icons/a7-privacy-3d.png"
      sections={[
        { title: { en: "Information you choose to share", my: "သင်မျှဝေရန် ရွေးချယ်သောအချက်အလက်" }, body: { en: "Your profile, preferences, saved searches, messages, and viewing requests help personalize the experience.", my: "သင့် profile၊ စိတ်ကြိုက်ရွေးချယ်မှု၊ သိမ်းထားသောရှာဖွေမှု၊ စာနှင့် အိမ်ကြည့်ရန်တောင်းဆိုချက်များက သင့်အတွက် သင့်လျော်သောအတွေ့အကြုံ ဖန်တီးရန် ကူညီပါသည်။" }, points: [
          { en: "Contact details remain private until you choose to share them.", my: "သင်ကိုယ်တိုင် မျှဝေမရွေးချယ်မီ ဆက်သွယ်ရန်အချက်အလက်များကို သီးသန့်ထားပါသည်။" },
          { en: "Saved homes and preferences support more relevant recommendations.", my: "သိမ်းထားသောအိမ်နှင့် စိတ်ကြိုက်ရွေးချယ်မှုများက ပိုမိုသက်ဆိုင်သော အကြံပြုချက်များ ရရှိစေပါသည်။" },
          { en: "Safety reports are handled separately from marketplace activity.", my: "လုံခြုံရေးတိုင်ကြားချက်များကို marketplace လုပ်ဆောင်မှုများနှင့် သီးခြား ကိုင်တွယ်ပါသည်။" },
        ] },
        { title: { en: "How your information is used", my: "သင့်အချက်အလက်ကို အသုံးပြုပုံ" }, body: { en: "A7 uses account information to provide requested features, protect marketplace trust, and improve property discovery.", my: "A7 သည် သင်တောင်းဆိုသောလုပ်ဆောင်ချက်များ ပံ့ပိုးရန်၊ marketplace ယုံကြည်မှုကို ကာကွယ်ရန်နှင့် အိမ်ရှာဖွေမှု ပိုကောင်းစေရန် account အချက်အလက်ကို အသုံးပြုပါသည်။" } },
        { title: { en: "Your controls", my: "သင်ထိန်းချုပ်နိုင်သည့်အရာများ" }, body: { en: "Profile settings let you manage notifications, language, communication permission, data export, and account-deletion requests.", my: "Profile settings တွင် အသိပေးချက်၊ ဘာသာစကား၊ ဆက်သွယ်ခွင့်၊ data export နှင့် account ဖျက်ရန်တောင်းဆိုချက်တို့ကို စီမံနိုင်ပါသည်။" } },
        { title: { en: "Local preview data", my: "စက်အတွင်းသိမ်းထားသော demo data" }, body: { en: "In the current local frontend, saved homes and preferences are stored on this device. Clearing browser data removes that local information.", my: "လက်ရှိ frontend demo တွင် သိမ်းထားသောအိမ်နှင့် စိတ်ကြိုက်ရွေးချယ်မှုများကို ဤစက်ထဲတွင်သာ သိမ်းပါသည်။ Browser data ရှင်းလင်းပါက ထိုအချက်အလက်များ ပျက်သွားပါမည်။" } },
      ]}
    />
  );
}
