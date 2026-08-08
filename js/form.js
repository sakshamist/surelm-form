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

  function setStatus(nextStatus) {
    status = nextStatus;
    var button = $('submitButton');
    if (!button) return;

    if (status === 'submitting') {
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span> Sending\u2026';
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

    // Clear localStorage before native form submission
    window.SureLMStorage.clear();

    // Use native form submission (bypasses bot-detection on fetch/AJAX)
    // The form has action="quokka.php" method="POST" enctype="multipart/form-data"
    // Remove the event listener to allow natural submission
    var form = $('joinForm');
    form.removeEventListener('submit', handleSubmit);
    form.submit();
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
