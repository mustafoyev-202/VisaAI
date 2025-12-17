export type VisaCountry = "canada" | "usa" | "uk" | "australia" | "germany" | "france" | "spain" | "italy" | "netherlands" | "sweden" | "switzerland" | "newzealand" | "singapore" | "japan" | "southkorea" | "other";

export type VisaType = "student" | "tourist" | "work" | "business" | "family" | "permanent" | "other";

export interface VisaRuleChunk {
  id: string;
  country: VisaCountry;
  visaType: VisaType;
  title: string;
  text: string;
}

// For hackathon scope we hard-code a very small, curated rules dataset.
// In a real system these would be ingested from official PDFs / websites.
export const VISA_RULE_CHUNKS: VisaRuleChunk[] = [
  {
    id: "canada-student-1",
    country: "canada",
    visaType: "student",
    title: "Canada student visa - basic eligibility",
    text: [
      "To study in Canada for more than six months, most foreign nationals need a study permit.",
      "The applicant must have a letter of acceptance from a designated learning institution in Canada.",
      "The applicant must prove they have sufficient funds to cover first year tuition and living expenses.",
      "Applicants may also need to show a clean immigration history and no serious criminal record.",
    ].join(" "),
  },
  {
    id: "canada-student-2",
    country: "canada",
    visaType: "student",
    title: "Canada student visa - proof of funds",
    text: [
      "For most provinces (outside Quebec), the minimum proof of funds usually includes tuition for the first year plus a fixed amount for living costs.",
      "For a single student, the living cost benchmark is often around 10,000 to 11,000 CAD per year, separate from tuition.",
      "Funds can be shown through bank statements, education loans, or a Guaranteed Investment Certificate if applicable.",
    ].join(" "),
  },
  {
    id: "canada-tourist-1",
    country: "canada",
    visaType: "tourist",
    title: "Canada visitor visa - basic requirements",
    text: [
      "Visitors must demonstrate that they will leave Canada at the end of their authorized stay.",
      "Applicants should show ties to their home country, such as employment, studies, family, or property.",
      "They must show sufficient funds to cover their trip and stay, and may need to provide a travel itinerary.",
      "A valid passport with adequate remaining validity is required.",
    ].join(" "),
  },
  {
    id: "usa-student-1",
    country: "usa",
    visaType: "student",
    title: "USA F-1 student visa - basic eligibility",
    text: [
      "Most full-time academic students in the United States use an F-1 visa.",
      "The applicant must first be accepted by a Student and Exchange Visitor Program approved school and receive a Form I-20.",
      "They must demonstrate non-immigrant intent and show that they plan to return home after their studies.",
      "They must show they can pay tuition and living expenses for at least the first year of study.",
    ].join(" "),
  },
  {
    id: "usa-tourist-1",
    country: "usa",
    visaType: "tourist",
    title: "USA B-1/B-2 visitor visa - basic requirements",
    text: [
      "The B-1/B-2 visa is for temporary visitors for business or tourism.",
      "Applicants must show that the purpose of the trip is temporary and that they will depart the United States at the end of their visit.",
      "They must demonstrate sufficient funds to cover expenses during their stay.",
      "They must show strong ties to their home country and no intention to immigrate.",
    ].join(" "),
  },
];


