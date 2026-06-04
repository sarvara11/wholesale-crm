'use strict';
const ProfilePage = (() => {
  function render(user) {
    return `
      <div class="page-header"><h2>Profile</h2></div>
      <div class="max-w-2xl space-y-5">

        <!-- Avatar card -->
        <div class="card p-6 flex items-center gap-5">
          <div class="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            ${Utils.initials(user.name)}
          </div>
          <div>
            <p class="text-xl font-bold text-gray-900 dark:text-white">${Utils.esc(user.name)}</p>
            <p class="text-gray-500 dark:text-gray-400">${Utils.esc(user.email)}</p>
            <p class="mt-1">${Utils.pill(user.role)}</p>
          </div>
        </div>

        <!-- Update name -->
        <div class="card p-6">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Update Name</h3>
          <form id="name-form" class="space-y-4">
            ${Utils.formRow('Full Name', Utils.formInput('name', user.name, 'text', 'Your Name', true))}
            <button type="submit" class="btn-primary">Save Changes</button>
          </form>
        </div>

        <!-- Change password -->
        <div class="card p-6">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
          <form id="pw-form" class="space-y-4">
            ${Utils.formRow('New Password',    Utils.formInput('password',  '', 'password', '••••••••', true))}
            ${Utils.formRow('Confirm Password',Utils.formInput('password2', '', 'password', '••••••••', true))}
            <button type="submit" class="btn-primary">Update Password</button>
          </form>
        </div>

        <!-- Session info -->
        <div class="card p-6">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Session Info</h3>
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><span class="font-medium text-gray-900 dark:text-white">User ID:</span>
              <span class="font-mono ml-2 text-xs">${user._id}</span></p>
            <p><span class="font-medium text-gray-900 dark:text-white">Role:</span>
              <span class="ml-2 capitalize">${user.role}</span></p>
            <p><span class="font-medium text-gray-900 dark:text-white">Account Created:</span>
              <span class="ml-2">${Utils.fmtDate(user.createdAt)}</span></p>
          </div>
        </div>
      </div>`;
  }

  async function init(user) {
    document.getElementById('name-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name = new FormData(e.target).get('name');
      try {
        await API.put('/users/' + user._id, { name });
        window.App.currentUser.name = name;
        document.getElementById('user-display-name').textContent = name;
        document.getElementById('user-avatar').textContent = Utils.initials(name);
        Utils.showToast('Name updated');
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });

    document.getElementById('pw-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd  = new FormData(e.target);
      const pw  = fd.get('password');
      const pw2 = fd.get('password2');
      if (pw !== pw2) { Utils.showToast('Passwords do not match', 'warning'); return; }
      if (pw.length < 6) { Utils.showToast('Password must be at least 6 characters', 'warning'); return; }
      try {
        await API.put('/users/' + user._id, { password: pw });
        Utils.showToast('Password updated');
        e.target.reset();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  return { render, init };
})();
