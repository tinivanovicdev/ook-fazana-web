// Membership form functionality
document.addEventListener('DOMContentLoaded', function() {
    initMembershipForm();
});

function initMembershipForm() {
    const form = document.getElementById('membershipForm');
    const programSelect = document.getElementById('program');
    const grupaSelect = document.getElementById('grupa');
    const datumUpisaInput = document.getElementById('datum-upisa');

    // Set today's date as default enrollment date
    const today = new Date().toISOString().split('T')[0];
    datumUpisaInput.value = today;

    // Program change handler
    programSelect.addEventListener('change', function() {
        updateGrupaOptions(this.value);
    });

    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleFormSubmission();
    });

    // OIB validation
    const oibInput = document.getElementById('oib');
    oibInput.addEventListener('input', function() {
        validateOIB(this);
    });
}

function updateGrupaOptions(program) {
    const grupaSelect = document.getElementById('grupa');
    grupaSelect.innerHTML = '<option value="">Odaberite grupu</option>';

    if (!program) {
        grupaSelect.disabled = true;
        return;
    }

    grupaSelect.disabled = false;

    // Define groups for each program
    const groups = {
        'skola-odbojke': [
            { value: 'skola-1', text: 'Škola odbojke - Grupa 1' },
            { value: 'skola-2', text: 'Škola odbojke - Grupa 2' }
        ],
        'mini-odbojka': [
            { value: 'mini-1', text: 'Mini odbojka - Grupa 1' },
            { value: 'mini-2', text: 'Mini odbojka - Grupa 2' }
        ],
        'mlade-kadetkinje': [
            { value: 'mlade-kadetkinje-1', text: 'Mlađe kadetkinje - Grupa 1' },
            { value: 'mlade-kadetkinje-2', text: 'Mlađe kadetkinje - Grupa 2' }
        ],
        'kadetkinje': [
            { value: 'kadetkinje-1', text: 'Kadetkinje - Grupa 1' },
            { value: 'kadetkinje-2', text: 'Kadetkinje - Grupa 2' }
        ],
        'juniorice': [
            { value: 'juniorice-1', text: 'Juniorice - Grupa 1' },
            { value: 'juniorice-2', text: 'Juniorice - Grupa 2' }
        ],
        'seniorice': [
            { value: 'seniorice-1', text: 'Seniorice - Grupa 1' },
            { value: 'seniorice-2', text: 'Seniorice - Grupa 2' }
        ]
    };

    const programGroups = groups[program] || [];
    programGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.value;
        option.textContent = group.text;
        grupaSelect.appendChild(option);
    });
}

function validateOIB(input) {
    const oib = input.value.replace(/\D/g, ''); // Remove non-digits
    input.value = oib;

    if (oib.length === 11) {
        if (isValidOIB(oib)) {
            input.style.borderColor = '#28a745';
            input.setCustomValidity('');
        } else {
            input.style.borderColor = '#dc3545';
            input.setCustomValidity('Neispravan OIB');
        }
    } else {
        input.style.borderColor = '';
        input.setCustomValidity('');
    }
}

function isValidOIB(oib) {
    // Croatian OIB validation algorithm
    if (oib.length !== 11) return false;
    
    let sum = 10;
    for (let i = 0; i < 10; i++) {
        sum = (sum + parseInt(oib[i])) % 10;
        if (sum === 0) sum = 10;
        sum = (sum * 2) % 11;
    }
    
    const checkDigit = (11 - sum) % 10;
    return checkDigit === parseInt(oib[10]);
}

async function handleFormSubmission() {
    const form = document.getElementById('membershipForm');
    const formData = new FormData(form);
    
    // Convert FormData to object
    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    // Show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Šalje se...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/membership', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showSuccessMessage('Uspješno ste se upisali! Kontaktirat ćemo vas uskoro.');
            form.reset();
            // Reset enrollment date to today
            document.getElementById('datum-upisa').value = new Date().toISOString().split('T')[0];
            // Reset grupa select
            document.getElementById('grupa').disabled = true;
            document.getElementById('grupa').innerHTML = '<option value="">Prvo odaberite program</option>';
        } else {
            throw new Error('Greška pri slanju zahtjeva');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showErrorMessage('Greška pri slanju zahtjeva. Molimo pokušajte ponovno.');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message form-message-${type}`;
    messageDiv.textContent = message;

    // Insert message after form
    const form = document.getElementById('membershipForm');
    form.parentNode.insertBefore(messageDiv, form.nextSibling);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}
