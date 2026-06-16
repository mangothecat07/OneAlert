import React, { useState } from "react";
import { ShieldCheck, MailWarning, UserX, CreditCard, EyeOff, ChevronDown, ChevronUp, BookOpen, AlertTriangle } from "lucide-react";

const AWARENESS_TOPICS = [
  {
    id: "phishing",
    title: "Phishing & Malicious Links",
    icon: MailWarning,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    description: "Phishing is a cyber attack that uses disguised email, SMS, or social media messages to trick you into revealing personal information or downloading malware.",
    indicators: [
      "Urgent or threatening language ('Your account will be suspended')",
      "Unexpected attachments or unfamiliar links",
      "Requests for passwords, OTPs, or financial details",
    ],
    actionSteps: [
      "Do NOT click any links or download attachments.",
      "Verify the sender's identity through official channels.",
      "Use the 'Scan Link' tool in OneAlert to check suspicious URLs.",
      "Report the message as spam/phishing."
    ]
  },
  {
    id: "deepfakes",
    title: "Deepfakes & Impersonation",
    icon: UserX,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    description: "Deepfakes are synthetic media in which a person in an existing image or video is replaced with someone else's likeness, often used for blackmail or misinformation.",
    indicators: [
      "Unnatural blinking or facial expressions in video",
      "Robotic or unusual voice patterns",
      "Unexpected video calls demanding money or compromising actions",
    ],
    actionSteps: [
      "Establish a 'safe word' with family members to verify their identity.",
      "Do not pay any extortion demands.",
      "Capture screenshots/screen recordings of the interaction.",
      "File a report immediately under the 'Deepfake / Impersonation' category."
    ]
  },
  {
    id: "fraud",
    title: "Financial Fraud & Scams",
    icon: CreditCard,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    description: "Scams involving fake lotteries, investment frauds, or individuals posing as bank officials asking for your OTP, UPI PIN, or CVV.",
    indicators: [
      "Requests to scan a QR code to 'receive' money",
      "Unsolicited calls asking for OTPs or banking details",
      "Offers that seem 'too good to be true' (e.g., guaranteed high returns)",
    ],
    actionSteps: [
      "Never share your OTP, UPI PIN, or CVV with anyone.",
      "Remember: You only need to enter your UPI PIN to SEND money, never to RECEIVE.",
      "Block and report the fraudulent numbers.",
      "Call your bank immediately to freeze your accounts/cards if compromised."
    ]
  },
  {
    id: "cyberstalking",
    title: "Cyberstalking & Harassment",
    icon: EyeOff,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    description: "The use of the internet or other electronic means to stalk, harass, or repeatedly intimidate an individual.",
    indicators: [
      "Unwanted, persistent messages across multiple platforms",
      "Tracking of your real-time location without consent",
      "Threats to release private information or photos (Doxxing)",
    ],
    actionSteps: [
      "Do not engage or respond to the harasser.",
      "Take clear screenshots of all messages and profiles before blocking them.",
      "Update your privacy settings on all social media accounts.",
      "Submit the evidence via OneAlert's Crime Report tool."
    ]
  }
];

const AwarenessView = ({ onBack }) => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--border)] pb-4 sticky top-0 bg-[var(--bg)] z-10 pt-2 shrink-0 gap-4 sm:gap-0">
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-display font-bold text-[var(--primary)] flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 shrink-0" />
            Cyber Security Awareness
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Learn how to identify threats and protect yourself online.
          </p>
        </div>
        {onBack && (
          <button onClick={onBack} className="w-full sm:w-auto px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-sm hover:border-[var(--primary)] transition-colors">
            Back
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
        {AWARENESS_TOPICS.map((topic) => (
          <div key={topic.id} className={`flex flex-col shrink-0 border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-300 ${expandedId === topic.id ? 'ring-1 ring-[var(--primary)]/50' : ''}`}>
            {/* Header / Trigger */}
            <button
              onClick={() => toggleExpand(topic.id)}
              className={`flex items-center justify-between p-5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors text-left`}
            >
              <div className="flex items-center gap-3 sm:gap-4 pr-2">
                <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${topic.bg} ${topic.color}`}>
                  <topic.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="font-bold text-[var(--text-primary)] text-base sm:text-lg text-left">{topic.title}</span>
              </div>
              <div className="shrink-0 ml-4 text-[var(--text-secondary)]">
                {expandedId === topic.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedId === topic.id && (
              <div className="flex flex-col p-6 bg-[var(--bg)] border-t border-[var(--border)] gap-6 animate-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
                    <BookOpen size={16} className={topic.color} /> Overview
                  </h4>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">{topic.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3 p-4 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--danger)] flex items-center gap-2">
                      <AlertTriangle size={16} /> Red Flags
                    </h4>
                    <ul className="flex flex-col gap-2">
                      {topic.indicators.map((ind, i) => (
                        <li key={i} className="text-xs text-[var(--text-primary)] flex items-start gap-2">
                          <span className="text-[var(--danger)] mt-0.5">•</span> {ind}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 p-4 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--primary)] flex items-center gap-2">
                      <ShieldCheck size={16} /> What to do
                    </h4>
                    <ul className="flex flex-col gap-2">
                      {topic.actionSteps.map((step, i) => (
                        <li key={i} className="text-xs text-[var(--text-primary)] flex items-start gap-2">
                          <span className="text-[var(--primary)] mt-0.5 font-bold">{i+1}.</span> {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AwarenessView;
