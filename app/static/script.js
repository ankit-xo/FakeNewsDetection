// ================= SCRIPT START =================
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ script.js loaded");

  /* ============= DARK MODE TOGGLE ====================*/
  const darkModeToggle = document.getElementById("darkModeToggle");

  if (darkModeToggle) {
    // Load saved state
    if (localStorage.getItem("darkMode") === "on") {
      document.body.classList.add("dark-mode");
      darkModeToggle.checked = true;
    }

    // Toggle handler
    darkModeToggle.addEventListener("change", function () {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem(
        "darkMode",
        darkModeToggle.checked ? "on" : "off"
      );
    });
  }

  /* ============== MODE SWITCH : TEXT / IMAGE ============= */
  const textModeBtn = document.getElementById("textModeBtn");
  const imageModeBtn = document.getElementById("imageModeBtn");
  const textForm = document.getElementById("textForm");
  const imageForm = document.getElementById("imageForm");

  function switchMode(mode) {
    if (!textForm || !imageForm) return;

    if (mode === "text") {
      textModeBtn?.classList.add("active");
      imageModeBtn?.classList.remove("active");
      textForm.style.display = "block";
      imageForm.style.display = "none";
    } else {
      imageModeBtn?.classList.add("active");
      textModeBtn?.classList.remove("active");
      imageForm.style.display = "block";
      textForm.style.display = "none";
    }
  }

  // Default mode
  switchMode("text");

  if (textModeBtn) {
    textModeBtn.addEventListener("click", function (e) {
      e.preventDefault(); // VERY IMPORTANT
      switchMode("text");
    });
  }

  if (imageModeBtn) {
    imageModeBtn.addEventListener("click", function (e) {
      e.preventDefault(); // VERY IMPORTANT
      switchMode("image");
    });
  }

  /* ==================== IMAGE PREVIEW + DRAG DROP ================ */
  const imageUpload = document.getElementById("imageUpload");
  const imagePreview = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");
  const removePreviewBtn = document.getElementById("removePreviewBtn");
  const uploadLabel = document.querySelector(".upload-label");

  function showPreview(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      imagePreview.style.display = "flex";
    };
    reader.readAsDataURL(file);
  }

  if (imageUpload) {
    imageUpload.addEventListener("change", function () {
      showPreview(imageUpload.files[0]);
    });
  }

  // Drag & drop
  if (uploadLabel && imageUpload) {
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
      uploadLabel.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    uploadLabel.addEventListener("drop", function (e) {
      const file = e.dataTransfer.files[0];
      imageUpload.files = e.dataTransfer.files;
      showPreview(file);
    });
  }

  // Remove preview
  if (removePreviewBtn) {
    removePreviewBtn.addEventListener("click", function () {
      imageUpload.value = "";
      previewImg.src = "";
      imagePreview.style.display = "none";
    });
  }

  /* ==================FEEDBACK BUTTONS ================ */
  const feedbackButtons = document.querySelectorAll(".feedback-btn");

  feedbackButtons.forEach(btn => {
    btn.addEventListener("click", async function (e) {
      e.preventDefault();
      
      const feedbackType = this.classList.contains("real-btn") ? "real" : "fake";
      const inputText = document.querySelector(".text-input")?.value || "";

      if (!inputText.trim()) {
        alert("No prediction found to submit feedback for.");
        return;
      }

      try {
        const response = await fetch("/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feedback: feedbackType,
            text: inputText
          })
        });

        if (response.ok) {
          // Update UI feedback
          feedbackButtons.forEach(b => b.classList.remove("selected"));
          this.classList.add("selected");

          console.log("✅ Feedback sent:", feedbackType);
          alert("Thank you for your feedback!");
        } else {
          console.error("❌ Feedback submission failed");
          alert("Failed to submit feedback. Please try again.");
        }
      } catch (error) {
        console.error("❌ Error sending feedback:", error);
        alert("Error submitting feedback.");
      }
    });
  });

  /* =================== CLEAR BUTTON ================= */
  
  const clearBtn = document.getElementById("clearBtn");

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      window.location.href = "/";
    });
  }

  console.log("✅ All JS features initialized");
});

