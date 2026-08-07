"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from '../styles/JoinForm.module.css';
import { useReferral } from "@/hooks/useReferral";
import type { ApplicationForm, FormStatus, FormErrors } from "@/types/form";

const INVOLVEMENT_OPTIONS = [
  "Just exploring for now",
  "Part-time, alongside other commitments",
  "Deeply, as a core ongoing contributor",
  "Ready to go all-in / full-time",
];

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ALLOWED_OTHER_TYPES = [
  ...ALLOWED_RESUME_TYPES,
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file: File | null, allowedTypes: string[]): string | null => {
  if (!file) return null;
  
  if (file.size > MAX_FILE_SIZE) {
    return `File size must be less than 10MB (${(file.size / 1024 / 1024).toFixed(2)}MB provided)`;
  }
  
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed: PDF, DOC, DOCX, TXT${allowedTypes.length > ALLOWED_RESUME_TYPES.length ? ', images, ZIP' : ''}`;
  }
  
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email) return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  
  return null;
};

const validateURL = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return "URL must start with http:// or https://";
    }
    return null;
  } catch {
    return "Please enter a valid URL";
  }
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return null;
  
  const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
  if (!phoneRegex.test(phone)) {
    return "Please enter a valid phone number";
  }
  
  return null;
};

const STORAGE_KEY = 'surelm-form-data';

export function JoinForm() {
  const navigate = useNavigate();
  const { referrerName } = useReferral();

  const [formData, setFormData] = useState<ApplicationForm>(() => {
    // Load from localStorage on mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          resume: null, // Don't persist files
          other: null,
        };
      }
    } catch (error) {
      console.error('Failed to load saved form data:', error);
    }
    
    return {
      fullname: "",
      email: "",
      phone: "",
      linkedin: "",
      contribution: "",
      interests: "",
      work_showcase: "",
      ownership: "",
      involvement: "",
      referred_by: "",
      resume: null,
      other: null,
    };
  });

  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (referrerName) {
      setFormData(prev => ({
        ...prev,
        referred_by: referrerName,
      }));
    }
  }, [referrerName]);

  useEffect(() => {
    if (status === "success") {
      // Clear saved form data on successful submission
      localStorage.removeItem(STORAGE_KEY);
      
      const timer = setTimeout(() => {
        navigate("/thank-you");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  // Save form data to localStorage (excluding files)
  useEffect(() => {
    try {
      const dataToSave = {
        ...formData,
        resume: null,
        other: null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save form data:', error);
    }
  }, [formData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as string }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'email' && value) {
      const error = validateEmail(value);
      setFieldErrors(prev => ({
        ...prev,
        email: error || undefined,
      }));
    } else if (name === 'linkedin' && value) {
      const error = validateURL(value);
      setFieldErrors(prev => ({
        ...prev,
        linkedin: error || undefined,
      }));
    } else if (name === 'phone' && value) {
      const error = validatePhone(value);
      setFieldErrors(prev => ({
        ...prev,
        phone: error || undefined,
      }));
    }
  };

  const processFile = (field: keyof ApplicationForm, file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
    
    // Validate file immediately
    if (file) {
      const allowedTypes = field === 'resume' ? ALLOWED_RESUME_TYPES : ALLOWED_OTHER_TYPES;
      const error = validateFile(file, allowedTypes);
      
      setFieldErrors(prev => ({
        ...prev,
        [field]: error || undefined,
      }));
    } else {
      setFieldErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleFile = (field: keyof ApplicationForm) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    processFile(field, file);
  };

  const handleDrop = (field: keyof ApplicationForm) => (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0] ?? null;
    processFile(field, file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    
    // Validate files before submission
    const errors: FormErrors = {};
    
    if (formData.resume) {
      const resumeError = validateFile(formData.resume, ALLOWED_RESUME_TYPES);
      if (resumeError) errors.resume = resumeError;
    } else {
      errors.resume = "Resume is required";
    }
    
    if (formData.other) {
      const otherError = validateFile(formData.other, ALLOWED_OTHER_TYPES);
      if (otherError) errors.other = otherError;
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus("error");
      setErrorMessage("Please fix the errors above before submitting.");
      return;
    }

    const data = new FormData();
    data.append("fullname", formData.fullname);
    data.append("email", formData.email);
    data.append("phone", formData.phone);
    data.append("linkedin", formData.linkedin);
    data.append("contribution", formData.contribution);
    data.append("interests", formData.interests);
    data.append("work_showcase", formData.work_showcase);
    data.append("ownership", formData.ownership);
    data.append("involvement", formData.involvement);
    data.append("referred_by", formData.referred_by);

    if (formData.resume) {
      data.append("resume", formData.resume);
    }
    if (formData.other) {
      data.append("other", formData.other);
    }

    try {
      const res = await fetch("/send.php", {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || "Something went wrong.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <>
      {referrerName && (
        <div className={styles.referralBanner}>
          <span className={styles.dot} />
          Referred by {referrerName}
        </div>
      )}

      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            Page 1 of 1 &middot; No rigid roles
          </div>
          <h1 className={styles.headline}>Join SureLM</h1>
          <p className={styles.lede}>
            SureLM is building systems for intelligent insurance distribution.
          </p>
          <p className={styles.ledeStrong}>
            We&apos;re looking for people who think deeply, build obsessively, and want to
            contribute meaningfully. Tell us how you think you can help.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={`field ${styles.field}`}>
              <span className={styles.index}>01</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="fullname">
                  What&apos;s your name?
                  <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  id="fullname"
                  name="fullname"
                  type="text"
                  required
                  value={formData.fullname}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={`field email ${styles.field}`}>
              <span className={styles.index}>02</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="email">
                  What&apos;s your email?
                  <span className={styles.required}>*</span>
                </label>
                <input
                  className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {fieldErrors.email && (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                )}
              </div>
            </div>

            <div className={`field phone ${styles.field}`}>
              <span className={styles.index}>03</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="phone">
                  What&apos;s your phone number?
                  <span className={styles.required}>*</span>
                </label>
                <input
                  className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {fieldErrors.phone && (
                  <span className={styles.fieldError}>{fieldErrors.phone}</span>
                )}
              </div>
            </div>

            <div className={`field linkedin ${styles.field}`}>
              <span className={styles.index}>04</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="linkedin">
                  LinkedIn Profile / Website
                </label>
                <input
                  className={`${styles.input} ${fieldErrors.linkedin ? styles.inputError : ''}`}
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  placeholder="https://..."
                  value={formData.linkedin}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {fieldErrors.linkedin && (
                  <span className={styles.fieldError}>{fieldErrors.linkedin}</span>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.index}>05</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="contribution">
                  How would you like to contribute to SureLM?
                  <span className={styles.required}>*</span>
                </label>
                <p className={styles.hint}>
                  {`Don't think in terms of titles. Tell us what you'd want to build,\nimprove, research, design, sell, or rethink.`}
                </p>
                <textarea
                  className={styles.textarea}
                  id="contribution"
                  name="contribution"
                  value={formData.contribution}
                  onChange={handleChange}
                  required
                />
                <span className={styles.charCount}>{formData.contribution.length} characters</span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.index}>06</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="interests">
                  What about insurance, AI, systems, distribution, or our direction interests you?
                  <span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  id="interests"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  required
                />
                <span className={styles.charCount}>{formData.interests.length} characters</span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.index}>07</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="work_showcase">
                  Show us something you&apos;ve worked on.
                  <span className={styles.required}>*</span>
                </label>
                <p className={styles.hint}>
                  {`Could be:
code
design
writing
research
sales work
strategy
a side project
anything meaningful

Links are welcome.`}
                </p>
                <textarea
                  className={styles.textarea}
                  id="work_showcase"
                  name="work_showcase"
                  value={formData.work_showcase}
                  onChange={handleChange}
                  required
                />
                <span className={styles.charCount}>{formData.work_showcase.length} characters</span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.index}>08</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="ownership">
                  If we gave you ownership tomorrow, what would you work on first?
                  <span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  id="ownership"
                  name="ownership"
                  value={formData.ownership}
                  onChange={handleChange}
                  required
                />
                <span className={styles.charCount}>{formData.ownership.length} characters</span>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.index}>09</span>
              <div className={styles.fieldBody}>
                <label className={styles.label}>
                  How involved are you looking to be?
                  <span className={styles.required}>*</span>
                </label>
                <div className={styles.radioGroup} role="radiogroup">
                  {INVOLVEMENT_OPTIONS.map((option) => (
                    <label className={styles.radioOption} key={option}>
                      <input
                        type="radio"
                        name="involvement"
                        value={option}
                        checked={formData.involvement === option}
                        onChange={handleChange}
                        required
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.index}>10</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="resume">
                  Resume / Portfolio / Anything relevant
                  <span className={styles.required}>*</span>
                </label>
                <p className={styles.hint}>Accepted: PDF, DOC, DOCX, TXT</p>
                <label 
                  className={`${styles.fileDrop} ${fieldErrors.resume ? styles.fileDropError : ''}`} 
                  htmlFor="resume-file"
                  onDrop={handleDrop("resume")}
                  onDragOver={handleDragOver}
                >
                  <span className={formData.resume ? styles.fileName : undefined}>
                    {formData.resume ? formData.resume.name : "Click to choose a file or drag here"}
                  </span>
                  <span>10MB max</span>
                </label>
                <input
                  id="resume-file"
                  type="file"
                  onChange={handleFile("resume")}
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx,.txt"
                  required
                />
                {fieldErrors.resume && (
                  <span className={styles.fieldError}>{fieldErrors.resume}</span>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.index}>11</span>
              <div className={styles.fieldBody}>
                <label className={styles.label} htmlFor="other-file">
                  Anything else?
                </label>
                <p className={styles.hint}>Accepted: PDF, DOC, DOCX, TXT, images, ZIP</p>
                <label 
                  className={`${styles.fileDrop} ${fieldErrors.other ? styles.fileDropError : ''}`} 
                  htmlFor="other-file"
                  onDrop={handleDrop("other")}
                  onDragOver={handleDragOver}
                >
                  <span className={formData.other ? styles.fileName : undefined}>
                    {formData.other ? formData.other.name : "Click to choose a file or drag here"}
                  </span>
                  <span>10MB max</span>
                </label>
                <input
                  id="other-file"
                  type="file"
                  onChange={handleFile("other")}
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip"
                />
                {fieldErrors.other && (
                  <span className={styles.fieldError}>{fieldErrors.other}</span>
                )}
              </div>
            </div>

            <div className={styles.submitRow}>
              <button
                className={styles.submitButton}
                type="submit"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? (
                  <>
                    <span className={styles.spinner} />
                    Sending…
                  </>
                ) : (
                  "Submit"
                )}
              </button>
              {status === "error" && (
                <span className={`${styles.status} ${styles.error}`}>{errorMessage}</span>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}