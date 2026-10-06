/* ============================================================
   SCHOOL LOGIN — FRONTEND CONTROLLER
   ------------------------------------------------------------
   Responsibilities:
   ✓ Validate email + password
   ✓ Sign in with Supabase Auth
   ✓ Load school profile
   ✓ Check role + account status
   ✓ Redirect to correct dashboard
   ============================================================ */

(function () {
  'use strict';

  const { url, anonKey } = window.SUPABASE_CONFIG;

  const supabase = window.supabase.createClient(url, anonKey);

  const form       = document.getElementById('loginForm');
  const emailEl    = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const submitBtn  = document.getElementById('loginSubmit');
  const alertEl    = document.getElementById('formAlert');
  const toggleBtn  = document.getElementById('passwordToggle');

  if (!form || !emailEl || !passwordEl || !submitBtn || !alertEl) {
    return;
  }

  /* ----------------------------------------------------------
     ALERT
     ---------------------------------------------------------- */

  const setAlert = (message, variant) => {
    if (!message) {
      alertEl.hidden = true;
      alertEl.textContent = '';
      alertEl.classList.remove('is-error', 'is-info');
      return;
    }

    alertEl.hidden = false;
    alertEl.textContent = message;

    alertEl.classList.remove('is-error', 'is-info');

    if (variant) {
      alertEl.classList.add(`is-${variant}`);
    }
  };

  /* ----------------------------------------------------------
     LOADING STATE
     ---------------------------------------------------------- */

  const setLoading = (isLoading) => {
    submitBtn.classList.toggle('is-loading', isLoading);
    submitBtn.disabled = isLoading;

    emailEl.disabled = isLoading;
    passwordEl.disabled = isLoading;
  };

  /* ----------------------------------------------------------
     INVALID FIELD
     ---------------------------------------------------------- */

  const markInvalid = (el, invalid) => {
    if (invalid) {
      el.setAttribute('aria-invalid', 'true');
    } else {
      el.removeAttribute('aria-invalid');
    }
  };

  /* ----------------------------------------------------------
     PASSWORD VISIBILITY
     ---------------------------------------------------------- */

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = passwordEl.type === 'text';

      passwordEl.type = isVisible ? 'password' : 'text';

      toggleBtn.setAttribute(
        'aria-pressed',
        String(!isVisible)
      );

      toggleBtn.setAttribute(
        'aria-label',
        isVisible ? 'Show password' : 'Hide password'
      );

      passwordEl.focus();
    });
  }

  /* ----------------------------------------------------------
     VALIDATION
     ---------------------------------------------------------- */

  const validate = () => {
    let valid = true;

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    markInvalid(emailEl, false);
    markInvalid(passwordEl, false);

    if (!email) {
      markInvalid(emailEl, true);
      valid = false;
    }

    if (!password) {
      markInvalid(passwordEl, true);
      valid = false;
    }

    if (!valid) {
      setAlert(
        'Please enter your email address and password.',
        'error'
      );

      if (!email) {
        emailEl.focus();
      } else {
        passwordEl.focus();
      }
    }

    return valid;
  };

  /* ----------------------------------------------------------
     LOGIN
     ---------------------------------------------------------- */

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    setAlert(null);

    if (!validate()) {
      return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    setLoading(true);

    try {

      /* ------------------------------------------------------
         SUPABASE LOGIN
         ------------------------------------------------------ */

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

      if (error) {
        console.error('[login] Supabase error:', error);

        setAlert(error.message, 'error');
        setLoading(false);
        return;
      }

      if (!data || !data.user) {
        setAlert(
          'Unable to sign in. Please try again.',
          'error'
        );

        setLoading(false);
        return;
      }

      /* ------------------------------------------------------
         LOAD SCHOOL PROFILE
         ------------------------------------------------------ */

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', data.user.id)
          .single();

      if (profileError || !profile) {
        console.error(
          '[login] Profile error:',
          profileError
        );

        await supabase.auth.signOut();

        setAlert(
          'Your account exists, but your school profile could not be found. Please contact the school office.',
          'error'
        );

        setLoading(false);
        return;
      }

      /* ------------------------------------------------------
         CHECK ACCOUNT STATUS
         ------------------------------------------------------ */

      if (profile.status !== 'active') {
        await supabase.auth.signOut();

        setAlert(
          'Your school account is not active. Please contact the school office.',
          'error'
        );

        setLoading(false);
        return;
      }

      /* ------------------------------------------------------
         DASHBOARD ROUTES
         ------------------------------------------------------ */

      const dashboardUrls = {
        student: '/student/dashboard.html',
        teacher: '/teacher/dashboard.html',
        admin: '/admin/dashboard.html'
      };

      const redirectTo =
        dashboardUrls[profile.role];

      if (!redirectTo) {
        await supabase.auth.signOut();

        setAlert(
          'Your account has an invalid role. Please contact the school office.',
          'error'
        );

        setLoading(false);
        return;
      }

      /* ------------------------------------------------------
         REDIRECT
         ------------------------------------------------------ */

      setAlert(
        'Signed in successfully.',
        'info'
      );

      window.location.replace(redirectTo);

    } catch (err) {

      console.error('[login] Unexpected error:', err);

      setAlert(
        'Unable to sign in. Please try again.',
        'error'
      );

      setLoading(false);
    }
  });

  /* ----------------------------------------------------------
     CLEAR ERROR WHILE TYPING
     ---------------------------------------------------------- */

  [emailEl, passwordEl].forEach((el) => {

    el.addEventListener('input', () => {

      markInvalid(el, false);

      if (
        !alertEl.hidden &&
        alertEl.classList.contains('is-error')
      ) {
        setAlert(null);
      }

    });

  });

})();