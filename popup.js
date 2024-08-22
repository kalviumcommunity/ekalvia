document.addEventListener('DOMContentLoaded', loadProvider)
document.addEventListener('DOMContentLoaded', setupForm)

async function setupForm(e) {
    const providerForm = document.getElementById('providerForm')
    // Add event listener to the form
    providerForm.addEventListener('change', function (event) {
        const selectedProvider = event.target.value
        // Store selected provider in local storage
        chrome.storage.local.set({ provider: selectedProvider })
    })
}

async function loadProvider() {
    // Retrieve and set the selected provider from local storage
    const storedProvider =
        (await chrome.storage.local.get('provider')) || 'gemini'
    document.querySelector(
        `input[value="${storedProvider.provider}"]`
    ).checked = true
}
