/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Array to store selected products */
let selectedProducts = [];

/* Array to store conversation history */
let conversationHistory = [];

/* Flag to track if a routine has been generated */
let routineGenerated = false;

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <div>
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
        <button class="learn-more-btn" data-product-id="${product.id}">
          Learn More
        </button>
      </div>
    </div>
  `
    )
    .join("");

  /* Add click event listeners to all product cards */
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      /* Don't trigger card selection if Learn More button was clicked */
      if (e.target.classList.contains("learn-more-btn")) {
        return;
      }

      /* Get the product ID from the data attribute */
      const productId = parseInt(card.dataset.productId);
      toggleProductSelection(productId, products);
    });
  });

  /* Add click event listeners to Learn More buttons */
  const learnMoreButtons = document.querySelectorAll(".learn-more-btn");
  learnMoreButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      /* Prevent the card click event from firing */
      e.stopPropagation();

      /* Get the product ID and show modal */
      const productId = parseInt(button.dataset.productId);
      const product = products.find((p) => p.id === productId);
      if (product) {
        showProductModal(product);
      }
    });
  });

  /* Update visual state of cards based on current selection */
  updateProductCardsVisual();
}

/* Toggle product selection on/off */
function toggleProductSelection(productId, allProducts) {
  /* Find the product object from the ID */
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  /* Check if product is already selected */
  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    /* Remove from selection if already selected */
    selectedProducts.splice(existingIndex, 1);
  } else {
    /* Add to selection if not selected */
    selectedProducts.push(product);
  }

  /* Update the displays */
  updateSelectedProductsDisplay();
  updateProductCardsVisual();
}

/* Update visual state of product cards */
function updateProductCardsVisual() {
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    const productId = parseInt(card.dataset.productId);
    const isSelected = selectedProducts.some((p) => p.id === productId);

    if (isSelected) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

/* Update the selected products display section */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p style="color: #666;">No products selected yet</p>';
    return;
  }

  /* Create tags for each selected product */
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-tag">
        ${product.name}
        <button class="remove-btn" data-product-id="${product.id}">×</button>
      </div>
    `
    )
    .join("");

  /* Add click handlers to remove buttons */
  const removeButtons = selectedProductsList.querySelectorAll(".remove-btn");
  removeButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = parseInt(btn.dataset.productId);
      /* Remove from selection */
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);
      updateSelectedProductsDisplay();
      updateProductCardsVisual();
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - now handles follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* Get the user's input */
  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  /* Check if user entered a message */
  if (!userMessage) {
    return;
  }

  /* Clear the input field */
  userInput.value = "";

  /* Check if a routine has been generated first */
  if (!routineGenerated) {
    addMessageToChat(
      "AI",
      "Please select products and generate a routine first, then I'll be happy to answer your follow-up questions!"
    );
    return;
  }

  /* Add user message to chat window */
  addMessageToChat("You", userMessage);

  /* Check if the question is related to beauty/skincare topics */
  if (!isBeautyRelatedQuestion(userMessage)) {
    addMessageToChat(
      "AI",
      "I can only help with questions related to skincare, haircare, makeup, fragrance, and beauty routines. Please ask me something about your routine or beauty topics!"
    );
    return;
  }

  /* Show loading message */
  showLoadingMessage();

  try {
    /* Send follow-up question to AI */
    await sendFollowUpQuestion(userMessage);
  } catch (error) {
    /* Show error message if API request fails */
    addMessageToChat(
      "AI",
      "Sorry, I had trouble processing your question. Please try asking again."
    );
    console.error("Error with follow-up question:", error);
  }
});

/* Add a message to the chat window */
function addMessageToChat(sender, message) {
  const messageClass = sender === "You" ? "user-message" : "ai-message";
  const messageHTML = `
    <div class="chat-message ${messageClass}">
      <div class="message-label">${sender}:</div>
      <div class="message-content">${message}</div>
    </div>
  `;

  chatWindow.insertAdjacentHTML("beforeend", messageHTML);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show loading message in chat */
function showLoadingMessage() {
  const loadingHTML = `
    <div class="chat-message ai-message" id="loadingMessage">
      <div class="message-label">AI:</div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 16px; height: 16px; border: 2px solid #ccc; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>Thinking...</span>
      </div>
    </div>
  `;

  chatWindow.insertAdjacentHTML("beforeend", loadingHTML);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Remove loading message */
function removeLoadingMessage() {
  const loadingMessage = document.getElementById("loadingMessage");
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

/* Check if question is related to beauty/skincare topics */
function isBeautyRelatedQuestion(question) {
  /* List of beauty-related keywords */
  const beautyKeywords = [
    "skin",
    "skincare",
    "face",
    "routine",
    "product",
    "makeup",
    "hair",
    "haircare",
    "beauty",
    "cleanser",
    "moisturizer",
    "serum",
    "cream",
    "lotion",
    "shampoo",
    "conditioner",
    "treatment",
    "mask",
    "fragrance",
    "perfume",
    "sunscreen",
    "foundation",
    "lipstick",
    "eyeshadow",
    "mascara",
    "blush",
    "concealer",
    "acne",
    "wrinkles",
    "dry",
    "oily",
    "sensitive",
    "aging",
    "pores",
    "breakout",
    "glow",
    "hydration",
    "exfoliate",
    "cleanse",
    "tone",
    "protect",
    "nourish",
  ];

  /* Convert question to lowercase for matching */
  const lowerQuestion = question.toLowerCase();

  /* Check if any beauty keywords are in the question */
  return beautyKeywords.some((keyword) => lowerQuestion.includes(keyword));
}

/* Send follow-up question to OpenAI API */
async function sendFollowUpQuestion(userMessage) {
  /* Add user message to conversation history */
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  /* Prepare the request data including conversation history */
  const requestData = {
    messages: conversationHistory,
  };

  /* Send request to the Cloudflare Worker */
  const response = await fetch(
    "https://billowing-wildflower-1d19.bxv5614.workers.dev/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    }
  );

  /* Remove loading message */
  removeLoadingMessage();

  /* Check if the request was successful */
  if (!response.ok) {
    throw new Error(`API request failed with status: ${response.status}`);
  }

  /* Get the JSON response from the API */
  const data = await response.json();

  /* Extract the AI's response from the API data */
  const aiResponse = data.choices[0].message.content;

  /* Add AI response to conversation history */
  conversationHistory.push({
    role: "assistant",
    content: aiResponse,
  });

  /* Display the AI response in the chat window */
  addMessageToChat("AI", aiResponse);
}

/* Show product details in a modal */
function showProductModal(product) {
  /* Create modal HTML */
  const modalHTML = `
    <div class="modal-overlay" id="productModal">
      <div class="modal-content">
        <button class="modal-close" id="closeModal">×</button>
        <img src="${product.image}" alt="${
    product.name
  }" class="modal-product-image">
        <h3 class="modal-product-name">${product.name}</h3>
        <p class="modal-product-brand">${product.brand}</p>
        <div class="modal-product-description">
          ${product.description || "No description available for this product."}
        </div>
      </div>
    </div>
  `;

  /* Add modal to the page */
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  /* Show the modal */
  const modal = document.getElementById("productModal");
  modal.classList.add("active");

  /* Add event listeners for closing the modal */
  const closeButton = document.getElementById("closeModal");
  closeButton.addEventListener("click", closeProductModal);

  /* Close modal when clicking outside the content */
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeProductModal();
    }
  });

  /* Close modal with Escape key */
  document.addEventListener("keydown", handleEscapeKey);
}

/* Close the product modal */
function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (modal) {
    /* Remove the modal from the page */
    modal.remove();

    /* Remove the escape key listener */
    document.removeEventListener("keydown", handleEscapeKey);
  }
}

/* Handle Escape key press to close modal */
function handleEscapeKey(e) {
  if (e.key === "Escape") {
    closeProductModal();
  }
}

/* Initialize selected products display */
updateSelectedProductsDisplay();

/* Generate Routine button click handler */
generateRoutineBtn.addEventListener("click", async () => {
  /* Check if user has selected any products */
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `
      <p style="color: #ff6b6b; font-weight: 500;">
        Please select at least one product to generate a routine.
      </p>
    `;
    return;
  }

  /* Show loading message while waiting for API response */
  chatWindow.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 20px; height: 20px; border: 2px solid #ccc; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <p>Generating your personalized routine...</p>
    </div>
  `;

  try {
    /* Call function to generate routine with selected products */
    await generateRoutineWithAI();
  } catch (error) {
    /* Show error message if API request fails */
    chatWindow.innerHTML = `
      <p style="color: #ff6b6b;">
        Sorry, there was an error generating your routine. Please try again.
      </p>
    `;
    console.error("Error generating routine:", error);
  }
});

/* Send selected products to OpenAI API and display response */
async function generateRoutineWithAI() {
  /* Prepare the products data to send to the API */
  const productsData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description || "No description available",
  }));

  /* Create the message for OpenAI asking for a routine */
  const userMessage = `Please create a personalized beauty/skincare routine using these products: ${JSON.stringify(
    productsData,
    null,
    2
  )}. 

  Please provide:
  1. A step-by-step routine explaining when and how to use each product
  2. Tips for best results
  3. Any important notes about product combinations

  Make the response friendly and easy to follow.`;

  /* Initialize conversation history with system message and routine request */
  conversationHistory = [
    {
      role: "system",
      content:
        "You are a helpful beauty and skincare expert who creates personalized routines and answers follow-up questions. Provide clear, practical advice and remember the conversation context. Always refer back to the user's selected products and previous questions when relevant.",
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  /* Prepare the request data for the Cloudflare Worker */
  const requestData = {
    messages: conversationHistory,
  };

  /* Send request to the Cloudflare Worker */
  const response = await fetch(
    "https://billowing-wildflower-1d19.bxv5614.workers.dev/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    }
  );

  /* Check if the request was successful */
  if (!response.ok) {
    throw new Error(`API request failed with status: ${response.status}`);
  }

  /* Get the JSON response from the API */
  const data = await response.json();

  /* Extract the AI's response from the API data */
  const aiResponse = data.choices[0].message.content;

  /* Add AI response to conversation history */
  conversationHistory.push({
    role: "assistant",
    content: aiResponse,
  });

  /* Clear chat window and display the AI-generated routine */
  chatWindow.innerHTML = "";

  /* Add the routine as the first message in the chat */
  addMessageToChat("AI", `🌟 Your Personalized Routine\n\n${aiResponse}`);

  /* Mark that a routine has been generated */
  routineGenerated = true;

  /* Scroll to the bottom of the chat window to show the response */
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
