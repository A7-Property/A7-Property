import { InformationPage } from "@/components/content/information-page";

export default function CommunityPage() {
  return (
    <InformationPage
      eyebrow={{ en: "A7 Property community", my: "A7 Property အသိုင်းအဝိုင်း" }}
      title={{ en: "Homes deserve honest, respectful conversations.", my: "အိမ်ရှာဖွေမှုတိုင်းမှာ ရိုးသားပြီး လေးစားမှုရှိသော ဆက်ဆံရေး လိုအပ်ပါတယ်။" }}
      intro={{ en: "Our standards help home seekers, owners, and agents feel safe while discovering and sharing property.", my: "ဤစည်းမျဉ်းများက အိမ်ရှာသူ၊ ပိုင်ရှင်နှင့် အကျိုးဆောင်များ အိမ်ခြံမြေရှာဖွေ မျှဝေရာတွင် လုံခြုံစိတ်ချစေပါသည်။" }}
      visualSrc="/icons/a7-community-3d.png"
      sections={[
        { title: { en: "Be truthful", my: "မှန်ကန်စွာ ဖော်ပြပါ" }, body: { en: "Photos, prices, availability, ownership details, and property facts should be current and accurate.", my: "ဓာတ်ပုံ၊ ဈေးနှုန်း၊ ရရှိနိုင်မှု၊ ပိုင်ဆိုင်မှုနှင့် အိမ်ခြံမြေအချက်အလက်များကို လက်ရှိအတိုင်း မှန်ကန်စွာ ဖော်ပြပါ။" } },
        { title: { en: "Be respectful", my: "လေးစားစွာ ဆက်ဆံပါ" }, body: { en: "Harassment, discrimination, intimidation, and pressure tactics are not allowed on A7 Property.", my: "နှောင့်ယှက်ခြင်း၊ ခွဲခြားဆက်ဆံခြင်း၊ ခြိမ်းခြောက်ခြင်းနှင့် ဖိအားပေးခြင်းကို A7 Property တွင် ခွင့်မပြုပါ။" } },
        { title: { en: "Protect each other", my: "အချင်းချင်း ကာကွယ်ပါ" }, body: { en: "Do not request unnecessary personal information. Meet in safe locations and report suspicious behavior.", my: "မလိုအပ်သော ကိုယ်ရေးအချက်အလက်များ မတောင်းပါနှင့်။ လုံခြုံသောနေရာတွင် တွေ့ဆုံပြီး သံသယဖြစ်ဖွယ်လုပ်ရပ်များကို တိုင်ကြားပါ။" } },
        { title: { en: "Build trust", my: "ယုံကြည်မှု တည်ဆောက်ပါ" }, body: { en: "Respond clearly, keep appointments, and update listings promptly when circumstances change.", my: "ရှင်းလင်းစွာ တုံ့ပြန်ပါ၊ ချိန်းဆိုမှုကို လေးစားပါ၊ အခြေအနေပြောင်းလဲလျှင် ကြော်ငြာကို ချက်ချင်း ပြင်ဆင်ပါ။" } },
      ]}
    />
  );
}
