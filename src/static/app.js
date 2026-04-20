document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityPlaceholder = '<option value="">-- Select an activity --</option>';
  let currentActivities = {};

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function renderActivities(selectedActivity = activitySelect.value) {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = activityPlaceholder;

    Object.entries(currentActivities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const participants = details.participants || [];
      const participantsMarkup = participants.length
        ? participants
            .map(
              (participant) =>
                `<li class="participant-item">
                  <span class="participant-email">${escapeHtml(participant)}</span>
                  <button
                    type="button"
                    class="participant-delete"
                    data-activity="${escapeHtml(name)}"
                    data-email="${escapeHtml(participant)}"
                    aria-label="Remove ${escapeHtml(participant)} from ${escapeHtml(name)}"
                    title="Unregister participant"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>`
            )
            .join("")
        : '<li class="participant-empty">No participants yet</li>';

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-section">
          <p class="participants-title"><strong>Participants:</strong></p>
          <ul class="participants-list">
            ${participantsMarkup}
          </ul>
        </div>
      `;

      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;

      if (name === selectedActivity) {
        option.selected = true;
      }

      activitySelect.appendChild(option);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      currentActivities = await response.json();
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregisterParticipant(activity, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Unable to unregister participant.", "error");
        return;
      }

      currentActivities[activity].participants = currentActivities[activity].participants.filter(
        (participant) => participant !== email
      );
      renderActivities(activity);
      showMessage(result.message, "success");
    } catch (error) {
      showMessage("Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        if (!currentActivities[activity].participants.includes(email)) {
          currentActivities[activity].participants.push(email);
        }

        renderActivities(activity);
        showMessage(result.message, "success");
        signupForm.reset();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".participant-delete");

    if (!deleteButton) {
      return;
    }

    const { activity, email } = deleteButton.dataset;

    if (!activity || !email) {
      return;
    }

    await unregisterParticipant(activity, email);
  });

  // Initialize app
  fetchActivities();
});
