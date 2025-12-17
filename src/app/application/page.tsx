 "use client";

import { useState, useRef, useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { COUNTRIES, type Country } from "@/lib/countries";
import { Tooltip } from "@/components/Tooltip";
import { ExpandableHelp } from "@/components/ExpandableHelp";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Confetti } from "@/components/Confetti";
import { TrustBadges } from "@/components/TrustBadges";
import { LightStepper } from "@/components/LightStepper";
import { TrustSidebar } from "@/components/TrustSidebar";
import { debounce, maskNumericInput, calculateTimeRemaining, saveFormData, loadFormData, generateSaveLink } from "@/lib/utils";

type DestinationCountry = "canada" | "usa" | "uk" | "australia" | "germany" | "france" | "spain" | "italy" | "netherlands" | "sweden" | "switzerland" | "newzealand" | "singapore" | "japan" | "southkorea" | "other";
type VisaType = "student" | "tourist" | "work" | "business" | "family" | "permanent" | "other";

interface AnalysisResult {
  analysis: {
    eligibility: string;
    summary: string;
    explanation: string;
    checklist: {
      required: string[];
      conditional: string[];
      riskyOrMissing: string[];
    };
    risks: string[];
  };
}

export default function ApplicationPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Enhanced Header */}
        <header className="mb-10">
          <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 p-10 shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-3xl shadow-lg">
                  ✈️
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Visa eligibility check
                  </h1>
                  <p className="mt-3 text-xl sm:text-2xl text-slate-700 dark:text-slate-300 font-medium">
                    Answer 5 questions. Get a checklist + risk flags in 60 seconds.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Supports:</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-base font-bold text-white shadow-lg">
                  🇨🇦 Canada (Visitor, Student)
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-base font-bold text-white shadow-lg">
                  🇺🇸 USA (Visitor, Student)
                </span>
                <span className="text-base text-slate-600 dark:text-slate-400 font-medium">More coming soon.</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Single Column Dominant */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Form Card - Dominant */}
          <div className="order-2 lg:order-1">
            <ProfileForm />
          </div>

          {/* Right Sidebar - Trust & Help - Quieter */}
          <aside className="order-1 lg:order-2 space-y-4">
            <TrustSidebar />
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t-2 border-slate-200 dark:border-slate-700 pt-6">
          <p className="text-base text-slate-600 dark:text-slate-400 font-medium text-center">
            Always double-check with official government sources (IRCC for Canada, USCIS for USA) before submitting your application.
          </p>
        </footer>
      </main>
    </div>
  );
}

function ProfileForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [destinationCountry, setDestinationCountry] =
    useState<DestinationCountry>("canada");
  const [visaType, setVisaType] = useState<VisaType>("student");
  const [nationality, setNationality] = useState("");
  const [currentCountry, setCurrentCountry] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [purpose, setPurpose] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [education, setEducation] = useState("");
  const [jobInfo, setJobInfo] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [fundsAvailable, setFundsAvailable] = useState("");
  const [estimatedCosts, setEstimatedCosts] = useState("");
  const [studyGapYears, setStudyGapYears] = useState("");
  const [priorRejection, setPriorRejection] = useState<"yes" | "no" | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [realTimeErrors, setRealTimeErrors] = useState<Record<string, string>>({});
  const errorAnnouncementRef = useRef<HTMLDivElement>(null);

  function validateStep(step: number): boolean {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!nationality.trim()) errors.nationality = "Nationality is required";
      if (!currentCountry.trim()) errors.currentCountry = "Country you're applying from is required";
      if (!ageRange.trim()) errors.ageRange = "Age range is required";
    }

    if (step === 2) {
      if (!purpose.trim()) errors.purpose = "Purpose is required";
      if (!durationMonths.trim()) errors.durationMonths = "Duration is required";
      if (!education.trim()) errors.education = "Education is required";
      if (!fundsAvailable.trim()) errors.fundsAvailable = "Funds available is required";
      if (!estimatedCosts.trim()) errors.estimatedCosts = "Estimated costs is required";
      if (!studyGapYears.trim()) errors.studyGapYears = "Study gap is required";
      if (priorRejection === "") errors.priorRejection = "Prior rejection status is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Load saved form data on mount
  useEffect(() => {
    const savedData = loadFormData();
    if (savedData) {
      // Restore form data
      if (savedData.nationality) setNationality(savedData.nationality);
      if (savedData.currentCountry) setCurrentCountry(savedData.currentCountry);
      if (savedData.ageRange) setAgeRange(savedData.ageRange);
      if (savedData.purpose) setPurpose(savedData.purpose);
      if (savedData.durationMonths) setDurationMonths(savedData.durationMonths);
      if (savedData.education) setEducation(savedData.education);
      if (savedData.fundsAvailable) setFundsAvailable(savedData.fundsAvailable);
      if (savedData.estimatedCosts) setEstimatedCosts(savedData.estimatedCosts);
      if (savedData.studyGapYears) setStudyGapYears(savedData.studyGapYears);
      if (savedData.priorRejection) setPriorRejection(savedData.priorRejection);
      if (savedData.destinationCountry) setDestinationCountry(savedData.destinationCountry);
      if (savedData.visaType) setVisaType(savedData.visaType);
      if (savedData.currentStep) setCurrentStep(savedData.currentStep);
      if (savedData.completedSteps) setCompletedSteps(savedData.completedSteps);
    }
  }, []);

  // Save form data on change
  useEffect(() => {
    const formData = {
      nationality,
      currentCountry,
      ageRange,
      purpose,
      durationMonths,
      education,
      fundsAvailable,
      estimatedCosts,
      studyGapYears,
      priorRejection,
      destinationCountry,
      visaType,
      currentStep,
      completedSteps,
    };
    saveFormData(formData);
  }, [nationality, currentCountry, ageRange, purpose, durationMonths, education, fundsAvailable, estimatedCosts, studyGapYears, priorRejection, destinationCountry, visaType, currentStep, completedSteps]);

  // Real-time validation
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (nationality && !nationality.trim()) errors.nationality = "Nationality is required";
      if (currentCountry && !currentCountry.trim()) errors.currentCountry = "Current country is required";
      if (ageRange && !ageRange.trim()) {
        errors.ageRange = "Please select an age range";
      }
    }
    
    if (currentStep === 2) {
      if (purpose && !purpose.trim()) errors.purpose = "Purpose is required";
      if (durationMonths && (!durationMonths.trim() || isNaN(Number(durationMonths)) || Number(durationMonths) < 1)) {
        errors.durationMonths = "Please enter a valid duration";
      }
    }
    
    if (currentStep === 2) {
      if (education && !education.trim()) errors.education = "Education is required";
      if (fundsAvailable && (!fundsAvailable.trim() || isNaN(Number(fundsAvailable)) || Number(fundsAvailable) < 0)) {
        errors.fundsAvailable = "Please enter a valid amount";
      }
      if (estimatedCosts && (!estimatedCosts.trim() || isNaN(Number(estimatedCosts)) || Number(estimatedCosts) < 0)) {
        errors.estimatedCosts = "Please enter a valid amount";
      }
      if (studyGapYears && (!studyGapYears.trim() || isNaN(Number(studyGapYears)) || Number(studyGapYears) < 0)) {
        errors.studyGapYears = "Please enter a valid number";
      }
    }
    
    setRealTimeErrors(errors);
  }, [currentStep, nationality, currentCountry, ageRange, purpose, durationMonths, education, fundsAvailable, estimatedCosts, studyGapYears]);

  // Announce errors to screen readers
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0 && errorAnnouncementRef.current) {
      errorAnnouncementRef.current.textContent = `Form errors: ${Object.values(validationErrors).join(", ")}`;
    }
  }, [validationErrors]);

  function goNext() {
    if (validateStep(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep((step) => Math.min(2, step + 1));
      setValidationErrors({});
    }
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
    setValidationErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (currentStep !== 2) {
      goNext();
      return;
    }

    // Validate all steps before submitting
    if (!validateStep(1) || !validateStep(2)) {
      setError("Please fill in all required fields before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setValidationErrors({});

    try {
      // Convert ageRange string to number (e.g., "18-24" -> 18, "65+" -> 65)
      const ageNumber = ageRange ? (() => {
        if (ageRange.includes("+")) {
          return parseInt(ageRange.replace("+", ""), 10);
        }
        const match = ageRange.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : undefined;
      })() : undefined;

      const res = await fetch("/api/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationality: nationality || "Not specified",
          currentCountry: currentCountry || "Not specified",
          age: ageNumber,
          destinationCountry,
          visaType,
          purpose,
          durationMonths: durationMonths ? Number(durationMonths) : undefined,
          education: education || undefined,
          jobInfo: jobInfo || undefined,
          fundsAvailable: fundsAvailable ? Number(fundsAvailable) : undefined,
          estimatedCosts: estimatedCosts ? Number(estimatedCosts) : undefined,
          studyGapYears: studyGapYears ? Number(studyGapYears) : undefined,
          priorRejection:
            priorRejection === ""
              ? undefined
              : priorRejection === "yes"
                ? true
                : false,
          preferredLanguage,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      const data = (await res.json()) as AnalysisResult;
      setResult(data);
      setCompletedSteps([1, 2]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err) {
      console.error(err);
      setError(
        "We couldn't analyze your profile. Please check your internet connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSaveAndContinue() {
    const link = generateSaveLink();
    // In a real app, this would send an email. For demo, we'll copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
      alert("Save link copied to clipboard! You can use this link to continue later.");
    });
  }

  const steps = [
    { id: 1, label: "Profile" },
    { id: 2, label: "Journey" },
  ];

  return (
    <div className="space-y-0">
      <Confetti trigger={showConfetti} />
      
      {/* Screen reader error announcements */}
      <div ref={errorAnnouncementRef} className="sr-only" role="alert" aria-live="polite" />
      
      {/* Form Card with Enhanced Background */}
      <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
        {/* Light Stepper */}
        <div className="px-8 pt-8">
          <LightStepper currentStep={currentStep} totalSteps={2} steps={steps} />
        </div>

        {/* Form Content */}
        <div className="px-8 pb-8">
          {loading ? (
            <SkeletonLoader />
          ) : (
            <form id="main-form" onSubmit={handleSubmit} className="space-y-8" noValidate aria-label="Visa assessment form">
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2 md:items-start">
                    <CountrySelector
                      id="nationality"
                      label="Your nationality *"
                      value={nationality}
                      onChange={setNationality}
                      placeholder="Search or select your nationality..."
                      required
                      tooltip="Select the country that issued your passport."
                      error={validationErrors.nationality || realTimeErrors.nationality}
                    />
                    <CountrySelector
                      id="current-country"
                      label="Country you're applying from (current location) *"
                      value={currentCountry}
                      onChange={setCurrentCountry}
                      placeholder="Search or select current location..."
                      required
                      tooltip="We use this to determine where you can apply and processing rules."
                      error={validationErrors.currentCountry || realTimeErrors.currentCountry}
                    />
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2 md:items-start">
                    <div className="flex flex-col space-y-3 h-full">
                      <label htmlFor="age-range" className="block text-base font-semibold text-slate-700 dark:text-slate-300 min-h-[1.5rem]">
                        Age range * <span className="text-sm font-normal text-slate-500">(Used only to check age-based rules. Not saved.)</span>
                      </label>
                      <select
                        id="age-range"
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                        required
                        className="w-full h-16 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 text-lg text-slate-900 dark:text-slate-100 shadow-md outline-none ring-0 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
                      >
                        <option value="">Select age range...</option>
                        <option value="18-24">18-24</option>
                        <option value="25-34">25-34</option>
                        <option value="35-44">35-44</option>
                        <option value="45-54">45-54</option>
                        <option value="55-64">55-64</option>
                        <option value="65+">65+</option>
                      </select>
                      <div className="min-h-[1.5rem]">
                        {(validationErrors.ageRange || realTimeErrors.ageRange) && (
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            {validationErrors.ageRange || realTimeErrors.ageRange}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-3 h-full">
                      <label htmlFor="preferred-language" className="block text-base font-semibold text-slate-700 dark:text-slate-300 min-h-[1.5rem]">
                        Output language
                      </label>
                      <select
                        id="preferred-language"
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full h-16 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 text-lg text-slate-900 dark:text-slate-100 shadow-md outline-none ring-0 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
                      >
                        <option value="">Select language...</option>
                        <option>English</option>
                        <option>French</option>
                        <option>Spanish</option>
                        <option>German</option>
                        <option>Arabic</option>
                        <option>Hindi</option>
                        <option>Chinese</option>
                        <option>Portuguese</option>
                      </select>
                      <div className="min-h-[1.5rem]"></div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2 md:items-start">
                    <DestinationCountrySelector
                      value={destinationCountry}
                      onChange={setDestinationCountry}
                      required
                    />
                    <VisaTypeSelector
                      value={visaType}
                      onChange={setVisaType}
                      required
                    />
                  </div>

                  <TextField
                    id="purpose"
                    label="Purpose of travel or stay *"
                    placeholder={
                      visaType === "student"
                        ? "e.g. Bachelor's degree in Computer Science at University of Toronto"
                        : "e.g. 2-week tourism visiting family in New York"
                    }
                    value={purpose}
                    onChange={setPurpose}
                    required
                    tooltip="Be specific about your purpose. This helps the AI match you with the right visa requirements."
                    error={validationErrors.purpose || realTimeErrors.purpose}
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <TextField
                      id="duration"
                      label="Trip duration (months) *"
                      type="number"
                      min={1}
                      max={60}
                      value={durationMonths}
                      onChange={setDurationMonths}
                      required
                      placeholder="e.g. 12 (for 1 year)"
                      tooltip="Enter the total duration in months."
                      error={validationErrors.durationMonths || realTimeErrors.durationMonths}
                    />
                    <TextField
                      id="education"
                      label="Highest education *"
                      placeholder="e.g. Bachelor's degree in Computer Science from XYZ University"
                      value={education}
                      onChange={setEducation}
                      required
                      tooltip="Include your degree level, field of study, and institution name if possible."
                      error={validationErrors.education || realTimeErrors.education}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <TextField
                      id="funds-available"
                      label="Funds available (home currency) *"
                      type="number"
                      min={0}
                      value={fundsAvailable}
                      onChange={setFundsAvailable}
                      required
                      maskNumeric
                      placeholder="e.g. 500000"
                      tooltip="Enter the total amount you have available for tuition, living expenses, and other costs."
                      error={validationErrors.fundsAvailable || realTimeErrors.fundsAvailable}
                    />
                    <TextField
                      id="estimated-costs"
                      label="Estimated costs per year (destination currency) *"
                      type="number"
                      min={0}
                      value={estimatedCosts}
                      onChange={setEstimatedCosts}
                      required
                      maskNumeric
                      placeholder="e.g. 30000"
                      tooltip="Include tuition fees, accommodation, food, transportation, and other living expenses."
                      error={validationErrors.estimatedCosts || realTimeErrors.estimatedCosts}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <TextField
                      id="study-gap"
                      label="Study / work gap (years) *"
                      type="number"
                      min={0}
                      max={20}
                      value={studyGapYears}
                      onChange={setStudyGapYears}
                      required
                      maskNumeric
                      placeholder="e.g. 2 (or 0 if no gap)"
                      tooltip="Enter 0 if you have no gap between studies or work."
                      error={validationErrors.studyGapYears || realTimeErrors.studyGapYears}
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Prior visa rejection * <Tooltip content="If you've been rejected for a visa to this country before, select 'Yes'."><span></span></Tooltip>
                      </label>
                      <div className="flex gap-2" role="radiogroup">
                        <button
                          type="button"
                          onClick={() => setPriorRejection("no")}
                          className={`flex-1 h-12 rounded-xl border-2 px-4 text-base font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            priorRejection === "no"
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriorRejection("yes")}
                          className={`flex-1 h-12 rounded-xl border-2 px-4 text-base font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            priorRejection === "yes"
                              ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          Yes
                        </button>
                      </div>
                      {validationErrors.priorRejection && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {validationErrors.priorRejection}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Section */}
              <div className="flex flex-col gap-6 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center justify-center h-16 rounded-2xl border-2 border-slate-300 dark:border-slate-600 px-8 text-lg font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-md"
                        aria-label="Go back to previous step"
                      >
                        ← Back
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-3 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 text-lg font-bold text-white shadow-xl transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                      aria-label={currentStep < 2 ? "Continue to next step" : "Get my checklist"}
                    >
                      {loading ? (
                        <>
                          <span className="h-6 w-6 animate-spin rounded-full border-3 border-white border-t-transparent" />
                          Running AI check…
                        </>
                      ) : currentStep < 2 ? (
                        <>Continue to visa options →</>
                      ) : (
                        <>🚀 Get my checklist</>
                      )}
                    </button>
                  </div>
                  <span className="text-base font-semibold text-slate-600 dark:text-slate-400 self-center">
                    Step {currentStep} of 2
                  </span>
                </div>

                {/* Trust Badges */}
                <TrustBadges />
              </div>
            </form>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Error</p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <ResultSection
          analysis={result.analysis}
          profile={{
            nationality,
            currentCountry,
            destinationCountry,
            visaType,
            purpose,
            durationMonths,
            ageRange,
            fundsAvailable,
            estimatedCosts,
            studyGapYears,
            priorRejection,
          }}
        />
      )}
    </div>
  );
}

interface ResultSectionProps {
  profile: {
    nationality: string;
    currentCountry: string;
    destinationCountry: DestinationCountry;
    visaType: VisaType;
    purpose: string;
    durationMonths: string;
    ageRange: string;
    fundsAvailable: string;
    estimatedCosts: string;
    studyGapYears: string;
    priorRejection: "yes" | "no" | "";
  };
  analysis: AnalysisResult["analysis"];
}

function StepHeader({ currentStep, completedSteps }: { currentStep: number; completedSteps: number[] }) {
  const steps = [
    { id: 1, label: "Your profile", description: "Nationality, location and basic info." },
    { id: 2, label: "Journey details", description: "Destination, visa type, purpose and duration." },
    { id: 3, label: "Checklist & risks", description: "Documents you need and risks to fix before applying." },
  ];

  const progressPercentage = Math.round((currentStep / 3) * 100);
  const timeRemaining = calculateTimeRemaining(currentStep, 3);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg">
      {/* Skip link for accessibility */}
      <a href="#main-form" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg">
        Skip to form
      </a>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Progress
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Step {currentStep} of {steps.length} ({progressPercentage}%)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ~{timeRemaining} min remaining
            </span>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <nav aria-label="Progress steps">
        <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" role="list">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);
            const isAccessible = isActive || isCompleted || currentStep > step.id;
            
            return (
              <li key={step.id} className="flex items-center gap-2 sm:flex-1">
                <div className="flex items-center gap-2 flex-1">
                  {/* Step indicator */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isActive
                          ? "border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-200 dark:ring-indigo-900"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                    }`}
                    aria-label={`Step ${step.id}: ${step.label}${isCompleted ? " - Completed" : isActive ? " - Current step" : ""}`}
                  >
                    {isCompleted ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  
                  {/* Step label */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : isCompleted
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`hidden sm:block h-0.5 flex-1 mx-2 transition-all ${
                      isCompleted || currentStep > step.id
                        ? "bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

function TextField(props: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
  required?: boolean;
  tooltip?: string;
  helpTitle?: string;
  helpContent?: string;
  error?: string;
  id?: string;
  maskNumeric?: boolean;
}) {
  // Bigger inputs: 48px height, 16px font
  const { label, placeholder, type = "text", value, onChange, min, max, required, tooltip, helpTitle, helpContent, error, id, maskNumeric } =
    props;
  
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    if (maskNumeric && type === "number") {
      newValue = maskNumericInput(newValue);
    }
    onChange(newValue);
  };

  return (
    <div className="flex flex-col space-y-3 h-full">
      <div className="flex items-center gap-2 min-h-[1.5rem]">
        <label htmlFor={fieldId} className="text-base font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {tooltip && <Tooltip content={tooltip}><span></span></Tooltip>}
      </div>
      <input
        id={fieldId}
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`w-full h-16 rounded-2xl border-2 px-5 text-lg font-medium shadow-md outline-none ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${
          error
            ? "border-red-500 bg-red-50 dark:bg-red-900/20 focus:border-red-600 focus:ring-4 focus:ring-red-500/20"
            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
        }`}
      />
      <div className="min-h-[1.5rem]">
        {error && (
          <p id={`${fieldId}-error`} className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
      {helpTitle && helpContent && (
        <ExpandableHelp title={helpTitle} content={helpContent} />
      )}
    </div>
  );
}

function CountrySelector({
  label,
  value,
  onChange,
  placeholder = "Search or select a country...",
  required,
  tooltip,
  helpTitle,
  helpContent,
  error,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  tooltip?: string;
  helpTitle?: string;
  helpContent?: string;
  error?: string;
  id?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter countries based on debounced search query
  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

  // Find selected country
  const selectedCountry = COUNTRIES.find((c) => c.name === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [focusedIndex, setFocusedIndex] = useState(-1);

  function handleSelect(country: Country) {
    onChange(country.name);
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredCountries.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && focusedIndex >= 0 && filteredCountries[focusedIndex]) {
        e.preventDefault();
        handleSelect(filteredCountries[focusedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
        setFocusedIndex(-1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, filteredCountries]);

  const fieldId = id || `country-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex flex-col space-y-3 relative h-full" ref={dropdownRef}>
      <div className="flex items-center gap-2 min-h-[1.5rem]">
        <label htmlFor={fieldId} className="text-base font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {tooltip && <Tooltip content={tooltip}><span></span></Tooltip>}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className={`w-full h-16 rounded-2xl border-2 bg-white dark:bg-slate-800 px-5 text-lg font-medium text-slate-900 dark:text-slate-100 shadow-md outline-none ring-0 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all flex items-center justify-between gap-3 ${
            error
              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
              : "border-slate-300 dark:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedCountry ? (
              <>
                <span className="text-2xl">{selectedCountry.flag}</span>
                <span className="truncate text-lg">{selectedCountry.name}</span>
              </>
            ) : (
              <span className="text-slate-400 text-lg">{placeholder}</span>
            )}
          </div>
          <svg
            className={`h-6 w-6 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
            <div className="p-2 border-b border-slate-200">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full h-12 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-64" role="listbox" aria-label="Country options">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country, index) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      value === country.name
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                        : index === focusedIndex
                          ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                    aria-selected={value === country.name}
                    role="option"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="text-lg">{country.name}</span>
                    {value === country.name && (
                      <svg
                        className="h-5 w-5 ml-auto text-indigo-600 dark:text-indigo-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-base text-slate-500 dark:text-slate-400 text-center font-medium">
                  No countries found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="min-h-6">
        {error && (
          <p id={`${fieldId}-error`} className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function DestinationCountrySelector({
  value,
  onChange,
  required,
}: {
  value: DestinationCountry;
  onChange: (value: DestinationCountry) => void;
  required?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map destination country codes to country names
  const destinationMap: Record<DestinationCountry, { name: string; flag: string }> = {
    canada: { name: "Canada", flag: "🇨🇦" },
    usa: { name: "United States", flag: "🇺🇸" },
    uk: { name: "United Kingdom", flag: "🇬🇧" },
    australia: { name: "Australia", flag: "🇦🇺" },
    germany: { name: "Germany", flag: "🇩🇪" },
    france: { name: "France", flag: "🇫🇷" },
    spain: { name: "Spain", flag: "🇪🇸" },
    italy: { name: "Italy", flag: "🇮🇹" },
    netherlands: { name: "Netherlands", flag: "🇳🇱" },
    sweden: { name: "Sweden", flag: "🇸🇪" },
    switzerland: { name: "Switzerland", flag: "🇨🇭" },
    newzealand: { name: "New Zealand", flag: "🇳🇿" },
    singapore: { name: "Singapore", flag: "🇸🇬" },
    japan: { name: "Japan", flag: "🇯🇵" },
    southkorea: { name: "South Korea", flag: "🇰🇷" },
    other: { name: "Other Country", flag: "🌍" },
  };

  const destinations = Object.entries(destinationMap) as [DestinationCountry, { name: string; flag: string }][];

  // Filter destinations based on search query
  const filteredDestinations = destinations.filter(([_, country]) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedDestination = destinationMap[value];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(dest: DestinationCountry) {
    onChange(dest);
    setIsOpen(false);
    setSearchQuery("");
  }

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-sm font-medium text-slate-700">Destination country</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedDestination ? (
              <>
                <span className="text-base">{selectedDestination.flag}</span>
                <span className="truncate">{selectedDestination.name}</span>
              </>
            ) : (
              <span className="text-slate-400">Select destination...</span>
            )}
          </div>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
            <div className="p-2 border-b border-slate-200">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredDestinations.length > 0 ? (
                filteredDestinations.map(([code, country]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                      value === code
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700"
                    }`}
                  >
                    <span className="text-base">{country.flag}</span>
                    <span>{country.name}</span>
                    {value === code && (
                      <svg
                        className="h-4 w-4 ml-auto text-indigo-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500 text-center">
                  No destinations found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VisaTypeSelector({
  value,
  onChange,
  required,
}: {
  value: VisaType;
  onChange: (value: VisaType) => void;
  required?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visaTypes: { code: VisaType; name: string; icon: string }[] = [
    { code: "student", name: "Student Visa", icon: "🎓" },
    { code: "tourist", name: "Tourist / Visitor Visa", icon: "✈️" },
    { code: "work", name: "Work Visa", icon: "💼" },
    { code: "business", name: "Business Visa", icon: "📊" },
    { code: "family", name: "Family Visa", icon: "👨‍👩‍👧‍👦" },
    { code: "permanent", name: "Permanent Residence", icon: "🏠" },
    { code: "other", name: "Other Visa Type", icon: "📋" },
  ];

  const filteredTypes = visaTypes.filter((type) =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedType = visaTypes.find((t) => t.code === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(type: VisaType) {
    onChange(type);
    setIsOpen(false);
    setSearchQuery("");
  }

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-sm font-medium text-slate-700">Visa type</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="w-full h-12 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-slate-100 shadow-sm outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 flex items-center justify-between gap-2 transition-all"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedType ? (
              <>
                <span className="text-base">{selectedType.icon}</span>
                <span className="truncate">{selectedType.name}</span>
              </>
            ) : (
              <span className="text-slate-400">Select visa type...</span>
            )}
          </div>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
            <div className="p-2 border-b border-slate-200">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredTypes.length > 0 ? (
                filteredTypes.map((type) => (
                  <button
                    key={type.code}
                    type="button"
                    onClick={() => handleSelect(type.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                      value === type.code
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-700"
                    }`}
                  >
                    <span className="text-base">{type.icon}</span>
                    <span>{type.name}</span>
                    {value === type.code && (
                      <svg
                        className="h-4 w-4 ml-auto text-emerald-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500 text-center">
                  No visa types found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// New exciting UI components
function EligibilityHeroCard({ analysis, score }: { analysis: AnalysisResult["analysis"]; score: number }) {
  const eligibility = analysis.eligibility || "Unknown";
  
  const getEligibilityConfig = () => {
    if (eligibility === "Likely") {
      return {
        gradient: "from-emerald-500 via-teal-500 to-cyan-500",
        bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
        icon: "✅",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
        textColor: "text-emerald-700 dark:text-emerald-300",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        message: "Great news! Your profile looks strong.",
      };
    } else if (eligibility === "Maybe") {
      return {
        gradient: "from-amber-500 via-orange-500 to-yellow-500",
        bgGradient: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
        icon: "⚠️",
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        textColor: "text-amber-700 dark:text-amber-300",
        borderColor: "border-amber-200 dark:border-amber-800",
        message: "Your profile needs some attention.",
      };
    } else {
      return {
        gradient: "from-rose-500 via-red-500 to-pink-500",
        bgGradient: "from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20",
        icon: "🚨",
        iconBg: "bg-rose-100 dark:bg-rose-900/30",
        textColor: "text-rose-700 dark:text-rose-300",
        borderColor: "border-rose-200 dark:border-rose-800",
        message: "There are significant concerns to address.",
      };
    }
  };

  const config = getEligibilityConfig();
  const riskPercentage = Math.min(score, 100);
  const successPercentage = 100 - riskPercentage;

  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 ${config.borderColor} bg-gradient-to-br ${config.bgGradient} p-8 shadow-2xl`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left Side - Eligibility Status */}
          <div className="flex items-start gap-4">
            <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${config.iconBg} text-4xl shadow-lg`}>
              {config.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {eligibility} Eligible
                </h2>
                <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${config.gradient} px-4 py-1.5 text-sm font-bold text-white shadow-lg`}>
                  {eligibility}
                </span>
              </div>
              <p className={`text-lg font-semibold ${config.textColor} mb-2`}>
                {config.message}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                {analysis.summary}
              </p>
            </div>
          </div>

          {/* Right Side - Success Meter */}
          <div className="flex-shrink-0">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${successPercentage * 3.52} 352`}
                  className={`text-emerald-500 transition-all duration-1000 ${successPercentage > 70 ? 'text-emerald-500' : successPercentage > 40 ? 'text-amber-500' : 'text-rose-500'}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${successPercentage > 70 ? 'text-emerald-600 dark:text-emerald-400' : successPercentage > 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {successPercentage}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStatsGrid({ profile, analysis }: { profile: ResultSectionProps["profile"]; analysis: AnalysisResult["analysis"] }) {
  const stats = [
    {
      label: "Destination",
      value: profile.destinationCountry === "canada" ? "🇨🇦 Canada" : profile.destinationCountry === "usa" ? "🇺🇸 USA" : profile.destinationCountry,
      icon: "🌍",
      dotColor: "bg-indigo-500",
    },
    {
      label: "Visa Type",
      value: profile.visaType === "student" ? "🎓 Student" : profile.visaType === "tourist" ? "✈️ Tourist" : profile.visaType,
      icon: "📋",
      dotColor: "bg-purple-500",
    },
    {
      label: "Duration",
      value: profile.durationMonths ? `${profile.durationMonths} months` : "Not specified",
      icon: "⏱️",
      dotColor: "bg-blue-500",
    },
    {
      label: "Documents Needed",
      value: `${analysis.checklist.required.length + analysis.checklist.conditional.length}`,
      icon: "📄",
      dotColor: "bg-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <div className={`h-2 w-2 rounded-full ${stat.dotColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                {stat.label}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsCardsGrid({ checklist }: { checklist: AnalysisResult["analysis"]["checklist"] }) {
  const sections = [
    {
      title: "Required Documents",
      items: checklist.required,
      icon: "✅",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      textColor: "text-emerald-700 dark:text-emerald-300",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      badgeBg: "bg-emerald-500",
      dotColor: "bg-emerald-500",
      description: "Must have these",
    },
    {
      title: "Conditional Documents",
      items: checklist.conditional,
      icon: "📋",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-700 dark:text-blue-300",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      badgeBg: "bg-blue-500",
      dotColor: "bg-blue-500",
      description: "May be needed",
    },
    {
      title: "Missing / Risky",
      items: checklist.riskyOrMissing,
      icon: "⚠️",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      borderColor: "border-amber-200 dark:border-amber-800",
      textColor: "text-amber-700 dark:text-amber-300",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      badgeBg: "bg-amber-500",
      dotColor: "bg-amber-500",
      description: "Review carefully",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {sections.map((section, index) => (
        <div
          key={index}
          className={`group relative overflow-hidden rounded-2xl border-2 ${section.borderColor} ${section.bgColor} p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${section.iconBg} text-2xl`}>
                {section.icon}
              </div>
              <div>
                <h3 className={`text-lg font-bold ${section.textColor} mb-1`}>
                  {section.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {section.description}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${section.badgeBg} text-white text-sm font-bold`}>
              {section.items.length}
            </span>
          </div>

          {section.items.length > 0 ? (
            <ul className="space-y-2">
              {section.items.slice(0, 5).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${section.dotColor} flex-shrink-0`} />
                  <span className="flex-1">{item}</span>
                </li>
              ))}
              {section.items.length > 5 && (
                <li className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                  +{section.items.length - 5} more items
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              No items in this category
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailedAnalysisCard({ analysis }: { analysis: AnalysisResult["analysis"] }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Detailed Analysis
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-powered assessment of your visa profile
          </p>
        </div>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 mb-4">
          {analysis.explanation}
        </p>
      </div>
    </div>
  );
}

function RisksCard({ risks }: { risks: string[] }) {
  return (
    <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-xl">
          ⚠️
        </div>
        <div>
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">
            Important Risks to Consider
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Address these before applying
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {risks.map((risk, i) => (
          <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-amber-900 dark:text-amber-100 flex-1">
              {risk}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InteractiveChecklist({ checklist }: { checklist: AnalysisResult["analysis"]["checklist"] }) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const allItems = [
    ...checklist.required.map(item => ({ text: item, type: "required" as const })),
    ...checklist.conditional.map(item => ({ text: item, type: "conditional" as const })),
    ...checklist.riskyOrMissing.map(item => ({ text: item, type: "risky" as const })),
  ];

  const toggleItem = (index: number) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const completedCount = checkedItems.size;
  const progressPercentage = allItems.length > 0 ? (completedCount / allItems.length) * 100 : 0;

  if (allItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Your Action Checklist
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track your progress as you prepare
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {completedCount}/{allItems.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Completed
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {Math.round(progressPercentage)}% complete
        </p>
      </div>

      <div className="grid gap-3">
        {allItems.map((item, index) => {
          const isChecked = checkedItems.has(index);
          const getTypeStyles = () => {
            if (item.type === "required") {
              return {
                border: "border-emerald-200 dark:border-emerald-800",
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
                text: "text-emerald-700 dark:text-emerald-300",
              };
            } else if (item.type === "conditional") {
              return {
                border: "border-blue-200 dark:border-blue-800",
                bg: "bg-blue-50 dark:bg-blue-900/20",
                text: "text-blue-700 dark:text-blue-300",
              };
            } else {
              return {
                border: "border-amber-200 dark:border-amber-800",
                bg: "bg-amber-50 dark:bg-amber-900/20",
                text: "text-amber-700 dark:text-amber-300",
              };
            }
          };
          const styles = getTypeStyles();

          return (
            <label
              key={index}
              className={`group flex items-start gap-3 p-4 rounded-xl border-2 ${styles.border} ${styles.bg} cursor-pointer hover:shadow-md transition-all ${
                isChecked ? "opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItem(index)}
                className="mt-1 h-5 w-5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
              <span className={`flex-1 text-sm font-medium ${isChecked ? "line-through" : ""} ${styles.text}`}>
                {item.text}
              </span>
              {item.type === "required" && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">
                  Required
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {title}
      </p>
      {items?.length ? (
        <ul className="space-y-1 text-[11px] text-zinc-100">
          {items.map((item, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="mt-[3px] h-[6px] w-[6px] rounded-full bg-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-zinc-500">Nothing specific listed.</p>
      )}
    </div>
  );
}

function SidebarExplainer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const items = [
    {
      label: "Profile",
      body: "We instantly match your answers to official visa rules.",
      icon: "👤",
      accent: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Official rules",
      body: "Based on IRCC & USCIS public guidance for accurate results.",
      icon: "📋",
      accent: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300",
    },
    {
      label: "AI reasoning",
      body: "Gemini compares your profile with those rules to estimate eligibility.",
      icon: "🤖",
      accent: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "Clear checklist",
      body: "The result is a simple list of documents and risks written in plain language.",
      icon: "✅",
      accent: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300",
    },
  ];

  const visibleItems = isMobile && !isExpanded ? items.slice(0, 2) : items;

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-5 text-xs text-slate-800 dark:text-slate-200 shadow-sm md:px-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          How this copilot works
        </p>
        {isMobile && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </button>
        )}
      </div>
      <div className="grid gap-3 text-[11px] sm:grid-cols-2">
        {visibleItems.map((item) => (
          <div
            key={item.label}
            className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xs transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{item.icon}</span>
              <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                {item.label}
              </p>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">{item.body}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-200 shadow-sm">
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2.5 shadow-sm">
      <p className="text-xs font-semibold text-zinc-50">{value}</p>
      <p className="mt-0.5 text-[11px] text-zinc-400">{label}</p>
    </div>
  );
}

function RiskMeter({ score }: { score: number }) {
  let color = "bg-emerald-500";
  let label = "Low risk";

  if (score > 20) {
    color = "bg-amber-500";
    label = "Medium risk";
  }
  if (score > 50) {
    color = "bg-rose-500";
    label = "High risk";
  }

  const widthPercentage = Math.min(score, 100);

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        Visa risk assessment
      </h3>

      <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${widthPercentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] mt-1">
        <span className="text-slate-500">Safer</span>
        <span className={color.replace("bg-", "text-") + " font-semibold"}>
          {label} ({Math.min(score, 100)}/100)
        </span>
        <span className="text-slate-500">Riskier</span>
      </div>

      <p className="text-[10px] text-slate-500">
        *Heuristic estimate based on age, funds, study gap, prior rejections and
        missing documents. Always confirm with official guidance.
      </p>
    </div>
  );
}

function ResultSection({ profile, analysis }: ResultSectionProps) {
  let score = 0;

  // Convert ageRange to number (e.g., "18-24" -> 18, "65+" -> 65)
  const ageNum = profile.ageRange ? (() => {
    if (profile.ageRange.includes("+")) {
      return parseInt(profile.ageRange.replace("+", ""), 10);
    }
    const match = profile.ageRange.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  })() : undefined;
  
  const fundsNum = profile.fundsAvailable
    ? Number(profile.fundsAvailable)
    : undefined;
  const costsNum = profile.estimatedCosts
    ? Number(profile.estimatedCosts)
    : undefined;
  const gapNum = profile.studyGapYears
    ? Number(profile.studyGapYears)
    : undefined;

  if (ageNum !== undefined && (ageNum < 18 || ageNum > 60)) {
    score += 10;
  }

  if (
    fundsNum !== undefined &&
    costsNum !== undefined &&
    fundsNum < costsNum
  ) {
    score += 40;
  }

  if (gapNum !== undefined && gapNum > 2) {
    score += 15;
  }

  if (profile.priorRejection === "yes") {
    score += 25;
  }

  const riskyCount = analysis.checklist.riskyOrMissing.length;
  if (riskyCount > 0) {
    score += 5 * riskyCount;
  }

  return (
    <section className="space-y-6 pt-6 animate-fade-up">
      {/* Hero Eligibility Card */}
      <EligibilityHeroCard analysis={analysis} score={score} />
      
      {/* Quick Stats Grid */}
      <QuickStatsGrid profile={profile} analysis={analysis} />
      
      {/* Documents Cards */}
      <DocumentsCardsGrid checklist={analysis.checklist} />
      
      {/* Detailed Analysis */}
      <DetailedAnalysisCard analysis={analysis} />
      
      {/* Risks & Recommendations */}
      {analysis.risks && analysis.risks.length > 0 && (
        <RisksCard risks={analysis.risks} />
      )}
      
      {/* Interactive Checklist */}
      <InteractiveChecklist checklist={analysis.checklist} />
    </section>
  );
}

function ProfileSummaryCard({
  profile,
  analysis,
}: {
  profile: ResultSectionProps["profile"];
  analysis: AnalysisResult["analysis"];
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-zinc-950/70 p-4 text-[11px] text-zinc-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Your profile snapshot
      </p>
      <p className="text-xs font-medium text-zinc-50">
        {profile.nationality || "Unspecified"} citizen currently in{" "}
        {profile.currentCountry || "unspecified"} applying for{" "}
        {profile.visaType === "student" ? "a student visa" : "a visitor visa"}{" "}
        to {profile.destinationCountry === "canada" ? "Canada" : "the USA"}.
      </p>
      <ul className="space-y-1 text-[11px] text-zinc-300">
        <li>
          <span className="font-medium text-zinc-100">Purpose:</span>{" "}
          {profile.purpose || "Not specified"}
        </li>
        <li>
          <span className="font-medium text-zinc-100">Planned duration:</span>{" "}
          {profile.durationMonths
            ? `${profile.durationMonths} months`
            : "Not specified"}
        </li>
        <li>
          <span className="font-medium text-zinc-100">AI status:</span>{" "}
          {analysis.eligibility || "Unknown"}
        </li>
      </ul>
    </div>
  );
}

function DocumentsOverview({
  checklist,
}: {
  checklist: AnalysisResult["analysis"]["checklist"];
}) {
  const sections = [
    {
      title: "Required documents",
      items: checklist.required,
      tone: "Required to apply",
    },
    {
      title: "Conditional documents",
      items: checklist.conditional,
      tone: "Depends on your situation",
    },
    {
      title: "Missing / risky",
      items: checklist.riskyOrMissing,
      tone: "Review before applying",
    },
  ];

  return (
    <div className="space-y-2 rounded-2xl border border-white/5 bg-zinc-950/70 p-4 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Documents overview
        </p>
        <span className="rounded-full bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
          AI-generated checklist – always confirm with official site
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="space-y-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
          >
            <p className="text-[11px] font-semibold text-zinc-100">
              {section.title}
            </p>
            <p className="text-[10px] text-zinc-500">{section.tone}</p>
            {section.items?.length ? (
              <ul className="mt-1.5 space-y-1 text-[11px] text-zinc-200">
                {section.items.map((item, index) => (
                  <li key={index} className="flex gap-1.5">
                    <span className="mt-[3px] h-[6px] w-[6px] rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[10px] text-zinc-500">
                Nothing specific listed yet.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalChecklist({
  checklist,
}: {
  checklist: AnalysisResult["analysis"]["checklist"];
}) {
  const allItems = [
    ...checklist.required,
    ...checklist.conditional,
    ...checklist.riskyOrMissing,
  ];

  if (!allItems.length) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-zinc-950/80 p-4 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Final checklist
          </p>
          <p className="text-[10px] text-zinc-500">
            Tick items as you prepare them. Use this as a discussion aid with
            an advisor or lawyer.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[10px] font-medium text-zinc-100 hover:bg-zinc-800"
        >
          Download as PDF (coming soon)
        </button>
      </div>
      <ul className="mt-1 space-y-1.5 text-[11px] text-zinc-100">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-[3px] h-3 w-3 rounded border-zinc-600 bg-zinc-900 text-indigo-500"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


