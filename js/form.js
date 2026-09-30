/**
 * Main form logic: state, validation, file handling, submission.
 * Vanilla JS port of the original React JoinForm component.
 */
(function () {
  'use strict';

  var ALLOWED_RESUME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  var ALLOWED_OTHER_TYPES = ALLOWED_RESUME_TYPES.concat([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
  ]);

  var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  var formData = {
    fullname: '',
    email: '',
    phone: '',
    linkedin: '',
    contribution: '',
    interests: '',
    work_showcase: '',
    ownership: '',
    involvement: '',
    referred_by: '',
    resume: null,
    other: null,
  };

  var status = 'idle'; // idle | submitting | success | error

  /* ---------- helpers ---------- */

  function $(id) {
    return document.getElementById(id);
  }

  function validateFile(file, allowedTypes) {
    if (!file) return null;

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB (' +
        (file.size / 1024 / 1024).toFixed(2) + 'MB provided)';
    }

    if (allowedTypes.indexOf(file.type) === -1) {
      var suffix = allowedTypes.length > ALLOWED_RESUME_TYPES.length ? ', images, ZIP' : '';
      return 'Invalid file type. Allowed: PDF, DOC, DOCX, TXT' + suffix;
    }

    return null;
  }

  function validateEmail(email) {
    if (!email) return null;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
  }

  function validateURL(url) {
    if (!url) return null;
    try {
      var urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return 'URL must start with http:// or https://';
      }
      return null;
    } catch (e) {
      return 'Please enter a valid URL';
    }
  }

  function validatePhone(phone) {
    if (!phone) return null;
    var phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
    if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
    return null;
  }

  function getFieldElement(field) {
    if (field === 'involvement') return document.querySelector('input[name="involvement"]');
    if (field === 'resume') return $('resume-file');
    if (field === 'other') return $('other-file');
    return $(field);
  }

  function setFieldError(field, message) {
    var errorEl = $('error-' + field);
    if (!errorEl) return;
    errorEl.textContent = message || '';

    var input = getFieldElement(field);
    if (!input || !input.classList) return;

    var isText = input.tagName === 'INPUT' || input.tagName === 'TEXTAREA';
    if (!isText) return;

    var errorClass = input.tagName === 'TEXTAREA' ? 'textareaError' : 'inputError';
    if (message) input.classList.add(errorClass);
    else input.classList.remove(errorClass);
  }

  function updateCharCount(field) {
    var countEl = $('count-' + field);
    if (countEl) countEl.textContent = (formData[field] || '').length + ' characters';
  }

  function setFileName(field, fileName) {
    var nameEl = $(field + '-name');
    if (!nameEl) return;
    if (fileName) {
      nameEl.textContent = fileName;
      nameEl.classList.add('fileName');
    } else {
      nameEl.textContent =
        field === 'resume' || field === 'other'
          ? 'Click to choose a file or drag here'
          : 'Click to choose a file';
      nameEl.classList.remove('fileName');
    }
  }

  function updateFileField(field) {
    var file = formData[field];
    var allowedTypes = field === 'resume' ? ALLOWED_RESUME_TYPES : ALLOWED_OTHER_TYPES;
    var error = null;

    if (file) {
      error = validateFile(file, allowedTypes);
    }

    var dropEl = $(field + '-drop');
    if (dropEl && dropEl.classList) {
      if (error) dropEl.classList.add('fileDropError');
      else dropEl.classList.remove('fileDropError');
    }

    setFieldError(field, error || '');
    setFileName(field, file ? file.name : null);
  }

  function processFile(field, file) {
    formData[field] = file;
    updateFileField(field);
  }

  function renderAll() {
    var fields = [
      'fullname', 'email', 'phone', 'linkedin', 'contribution',
      'interests', 'work_showcase', 'ownership',
    ];

    fields.forEach(function (field) {
      var input = $(field);
      if (input) input.value = formData[field] || '';
      if (field === 'contribution' || field === 'interests' ||
          field === 'work_showcase' || field === 'ownership') {
        updateCharCount(field);
      }
    });

    if (formData.involvement) {
      var radios = document.querySelectorAll('input[name="involvement"]');
      radios.forEach(function (radio) {
        radio.checked = radio.value === formData.involvement;
      });
    }

    $('referredBy').value = formData.referred_by || '';
    updateFileField('resume');
    updateFileField('other');
  }

  /* ---------- event handlers ---------- */

  function handleChange(e) {
    var name = e.target.name;
    if (name === 'involvement') {
      formData.involvement = e.target.value;
    } else if (name === 'resume' || name === 'other') {
      var field = name;
      processFile(field, e.target.files && e.target.files[0] ? e.target.files[0] : null);
    } else {
      formData[name] = e.target.value;
      if (name === 'contribution' || name === 'interests' ||
          name === 'work_showcase' || name === 'ownership') {
        updateCharCount(name);
      }
    }
  }

  function handleBlur(e) {
    var name = e.target.name;
    var value = e.target.value || '';

    if (name === 'email') setFieldError('email', validateEmail(value));
    else if (name === 'linkedin') setFieldError('linkedin', validateURL(value));
    else if (name === 'phone') setFieldError('phone', validatePhone(value));
  }

  function handleFocusIn(e) {
    var field = e.target.closest('.field');
    if (field) field.classList.add('active');
  }

  function handleFocusOut(e) {
    var field = e.target.closest('.field');
    if (field) field.classList.remove('active');
  }

  function handleDrop(fieldName) {
    return function (e) {
      e.preventDefault();
      e.stopPropagation();
      var dropEl = $(fieldName + '-drop');
      if (dropEl) dropEl.classList.remove('dragOver');
      var file = e.dataTransfer.files && e.dataTransfer.files[0]
        ? e.dataTransfer.files[0] : null;
      processFile(fieldName, file);
    };
  }

  function handleDragOver(fieldName) {
    return function (e) {
      e.preventDefault();
      e.stopPropagation();
    };
  }

  function handleDragEnter(fieldName) {
    return function (e) {
      e.preventDefault();
      e.stopPropagation();
      var dropEl = $(fieldName + '-drop');
      if (dropEl) dropEl.classList.add('dragOver');
    };
  }

  function handleDragLeave(fieldName) {
    return function (e) {
      e.preventDefault();
      e.stopPropagation();
      var dropEl = $(fieldName + '-drop');
      if (dropEl) dropEl.classList.remove('dragOver');
    };
  }

  function setStatus(nextStatus, label) {
    status = nextStatus;
    var button = $('submitButton');
    if (!button) return;

    if (status === 'submitting') {
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span> ' + (label || 'Sending\u2026');
    } else {
      button.disabled = false;
      button.textContent = 'Submit';
    }
  }

  function showError(message) {
    $('formError').textContent = message || '';
  }

  function validateAll() {
    var errors = {};

    if (!formData.fullname.trim()) errors.fullname = 'Please enter your name';

    var emailErr = validateEmail(formData.email);
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (emailErr) errors.email = emailErr;

    var phoneErr = validatePhone(formData.phone);
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    else if (phoneErr) errors.phone = phoneErr;

    var linkedinErr = validateURL(formData.linkedin);
    if (formData.linkedin.trim() && linkedinErr) errors.linkedin = linkedinErr;

    if (!formData.contribution.trim()) errors.contribution = 'Please tell us how you\'d like to contribute';
    if (!formData.interests.trim()) errors.interests = 'Please tell us what interests you';
    if (!formData.work_showcase.trim()) errors.work_showcase = 'Please share something you\'ve worked on';
    if (!formData.ownership.trim()) errors.ownership = 'Please tell us what you\'d work on first';
    if (!formData.involvement) errors.involvement = 'Please choose how involved you\'d like to be';

    if (formData.resume) {
      var resumeErr = validateFile(formData.resume, ALLOWED_RESUME_TYPES);
      if (resumeErr) errors.resume = resumeErr;
    } else {
      errors.resume = 'Resume is required';
    }

    if (formData.other) {
      var otherErr = validateFile(formData.other, ALLOWED_OTHER_TYPES);
      if (otherErr) errors.other = otherErr;
    }

    return errors;
  }

  var SUBMIT_ERROR = 'We could not send your application. Your details are still here — please try again.';
  var SUBMIT_TIMEOUT = 30000;
  var SUBMIT_ATTEMPTS = 3;

  // Delays between attempts, indexed by the attempt that just failed. The gaps
  // are long enough for the host's bot protection to have issued a cookie on the
  // dropped request, which is what lets the next attempt through.
  var SUBMIT_BACKOFF = [900, 2500];

  /**
   * A token identifying one submission intent.
   *
   * It is generated once per submit click and reused across every attempt, so
   * the server can recognise a retry and suppress a second email. A click after
   * the applicant edits the form is a new intent and therefore a new token.
   */
  function newSubmissionToken() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    var bytes = new Uint8Array(16);

    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    var hex = '';
    for (var j = 0; j < bytes.length; j++) {
      hex += ('0' + bytes[j].toString(16)).slice(-2);
    }

    return hex;
  }

  function isJsonResponse(res) {
    var contentType = res.headers.get('Content-Type') || '';
    return contentType.toLowerCase().indexOf('application/json') !== -1;
  }

  function buildPayload(token) {
    var data = new FormData();
    var fields = [
      'fullname', 'email', 'phone', 'linkedin', 'contribution',
      'interests', 'work_showcase', 'ownership', 'involvement', 'referred_by',
    ];

    fields.forEach(function (field) {
      data.append(field, formData[field] || '');
    });

    if (formData.resume) data.append('resume', formData.resume);
    if (formData.other) data.append('other', formData.other);

    // Honeypot: the server rejects anything that arrives filled in.
    var honeypot = $('website_url');
    data.append('website_url', honeypot ? honeypot.value : '');

    // Rebuilt from the live File objects on every attempt, so a retry re-sends
    // the real bytes without the applicant re-picking anything.
    data.append('submit_token', token || '');

    return data;
  }

  // Abort a request that hangs, so the button can never be stuck disabled.
  function fetchWithTimeout(url, options, timeout) {
    if (typeof AbortController === 'undefined') {
      return fetch(url, options);
    }

    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, timeout);

    options.signal = controller.signal;

    return fetch(url, options).then(function (res) {
      window.clearTimeout(timer);
      return res;
    }, function (err) {
      window.clearTimeout(timer);
      throw err;
    });
  }

  /**
   * A failure where no response arrived at all, as opposed to one the server
   * actually answered. TypeError is what fetch rejects with when the connection
   * is dropped mid-flight; AbortError is our own timeout.
   */
  function isTransportFailure(err) {
    return !!err && (err.name === 'TypeError' || err.name === 'AbortError');
  }

  /**
   * POST the payload, retrying only dropped connections.
   *
   * The host kills the first request often enough that the form is unusable
   * without this. Once a response arrives it is final and is handed straight
   * back: retrying a server-side rejection would only resubmit work the server
   * already refused.
   */
  function submitWithRetry(endpoint, token, onAttempt) {
    var attempt = 0;

    function attemptOnce() {
      attempt++;

      if (onAttempt) onAttempt(attempt);

      return fetchWithTimeout(
        endpoint,
        { method: 'POST', body: buildPayload(token) },
        SUBMIT_TIMEOUT
      );
    }

    function run() {
      return attemptOnce().catch(function (err) {
        if (attempt >= SUBMIT_ATTEMPTS || !isTransportFailure(err)) {
          throw err;
        }

        var wait = SUBMIT_BACKOFF[attempt - 1] || SUBMIT_BACKOFF[SUBMIT_BACKOFF.length - 1];

        console.warn(
          '[surelm] attempt ' + attempt + '/' + SUBMIT_ATTEMPTS + ' dropped (' +
          (err && err.name ? err.name : 'error') + '), retrying in ' + wait + 'ms'
        );

        return new Promise(function (resolve) {
          window.setTimeout(resolve, wait);
        }).then(run);
      });
    }

    return run();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;

    var errors = validateAll();

    // Render errors / clear them.
    var allFields = [
      'fullname', 'email', 'phone', 'linkedin', 'contribution',
      'interests', 'work_showcase', 'ownership', 'involvement', 'resume', 'other',
    ];
    allFields.forEach(function (field) {
      setFieldError(field, errors[field] || '');
    });

    var errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setStatus('idle');
      showError('Please fix the errors above before submitting.');
      return;
    }

    showError('');
    setStatus('submitting');

    // The endpoint lives on the form's action attribute - single source of truth.
    var endpoint = $('joinForm').getAttribute('action');
    var token = newSubmissionToken();

    submitWithRetry(endpoint, token, function (attempt) {
      setStatus(
        'submitting',
        attempt === 1
          ? null
          : 'Retrying (' + attempt + ' of ' + SUBMIT_ATTEMPTS + ')\u2026'
      );
    })
      .then(function (res) {
        // A catch-all / WAF challenge answers with HTML. Never treat that as success.
        if (!isJsonResponse(res)) {
          throw new Error('non-json');
        }
        return res.json();
      })
      .then(function (result) {
        // Strict handshake: thank-you requires success === true.
        if (!result || result.success !== true) {
          var message = (result && result.error) || SUBMIT_ERROR;

          if (result && result.fields) {
            Object.keys(result.fields).forEach(function (field) {
              setFieldError(field, result.fields[field]);
            });
          }

          throw new Error(message);
        }

        // Only now is the submission confirmed.
        window.SureLMStorage.clear();
        setStatus('success');
        window.location.href = 'thank-you.html';
      })
      .catch(function (err) {
        // Keep the form intact so the applicant can retry immediately.
        setStatus('idle');

        var message = SUBMIT_ERROR;

        if (err) {
          if (err.name === 'AbortError') {
            message = 'The upload took too long and was cancelled. Your details are still here — please try again.';
          } else if (isTransportFailure(err)) {
            // Never surfaces as an exception: fetch rejects with a bare TypeError.
            message = 'We could not reach the server after ' + SUBMIT_ATTEMPTS +
              ' attempts. Your details are still here — please try again.';
          } else if (err.message && err.message !== 'non-json') {
            message = err.message;
          }
        }

        console.warn(
          '[surelm] submission failed',
          err && err.name,
          err && err.message,
          isTransportFailure(err)
        );

        showError(message);
      });
  }

  /* ---------- init ---------- */

  function init() {
    var form = $('joinForm');
    if (!form) return;

    // Referral: show box above the first field and fill hidden field (takes precedence over saved data).
    var referrerName = window.SureLMReferral.getReferrerName();
    if (referrerName) {
      formData.referred_by = referrerName;
      $('referralName').textContent = referrerName;
      $('referralBox').hidden = false;
    }

    // Restore saved data (does not include files).
    var saved = window.SureLMStorage.load();
    if (saved) {
      Object.keys(saved).forEach(function (field) {
        if (typeof saved[field] === 'string' && field !== 'referred_by') {
          formData[field] = saved[field];
        }
      });
      // Keep referral override.
      if (referrerName) formData.referred_by = referrerName;
    }

    renderAll();

    // Input/change listeners (text inputs, textareas, radios).
    form.addEventListener('change', handleChange);
    form.addEventListener('input', handleChange);

    // Blur validation.
    ['email', 'phone', 'linkedin'].forEach(function (field) {
      var input = $(field);
      if (input) input.addEventListener('blur', handleBlur);
    });

    // Active field highlight.
    form.addEventListener('focusin', handleFocusIn);
    form.addEventListener('focusout', handleFocusOut);

    // File drop zones.
    ['resume', 'other'].forEach(function (field) {
      var dropEl = $(field + '-drop');
      if (!dropEl) return;
      dropEl.addEventListener('drop', handleDrop(field));
      dropEl.addEventListener('dragover', handleDragOver(field));
      dropEl.addEventListener('dragenter', handleDragEnter(field));
      dropEl.addEventListener('dragleave', handleDragLeave(field));
    });

    // Auto-save string fields (debounced).
    var saveTimer = null;
    form.addEventListener('input', function () {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(function () {
        window.SureLMStorage.save(formData);
      }, 500);
    });
    form.addEventListener('change', function () {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(function () {
        window.SureLMStorage.save(formData);
      }, 500);
    });

    form.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
