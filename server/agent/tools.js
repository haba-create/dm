/**
 * Claude Agent Tools
 *
 * These tools give Claude the ability to take actions in the gallery system:
 * - Look up clients and their history
 * - Create and manage orders
 * - Send emails
 * - Create payment links
 * - Get artwork information
 */

// Tool definitions following Anthropic's tool use schema
const GALLERY_TOOLS = [
  {
    name: "lookup_client",
    description: "Look up a client by email to retrieve their account information, order history, and preferences. Use this when a client mentions their email or when you need to check if someone is a returning customer.",
    input_schema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "The client's email address"
        }
      },
      required: ["email"]
    }
  },
  {
    name: "get_artwork_details",
    description: "Retrieve detailed information about a specific artwork including title, price, dimensions, technique, availability, and description. Use this when a client asks about a specific piece or when you need to provide pricing information.",
    input_schema: {
      type: "object",
      properties: {
        artwork_id: {
          type: "integer",
          description: "The ID of the artwork to look up"
        },
        title: {
          type: "string",
          description: "The title of the artwork (used for fuzzy search if ID not provided)"
        }
      }
    }
  },
  {
    name: "list_available_artworks",
    description: "Get a list of all available artworks for sale. Use this to help clients browse the collection or when they want to see what's available.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category filter (e.g., 'Animals', 'Nature', 'Contemporary')"
        },
        max_price: {
          type: "number",
          description: "Optional maximum price filter in GBP"
        },
        limit: {
          type: "integer",
          description: "Maximum number of results to return (default 10)"
        }
      }
    }
  },
  {
    name: "create_order",
    description: "Create a new order or inquiry when a client expresses interest in purchasing artwork, commissioning a piece, or ordering a print. Always collect client email before creating an order.",
    input_schema: {
      type: "object",
      properties: {
        client_email: {
          type: "string",
          description: "The client's email address (required)"
        },
        client_name: {
          type: "string",
          description: "The client's full name"
        },
        order_type: {
          type: "string",
          enum: ["purchase", "commission", "print"],
          description: "Type of order: purchase (existing artwork), commission (custom work), or print"
        },
        artwork_id: {
          type: "integer",
          description: "For purchases, the ID of the specific artwork"
        },
        title: {
          type: "string",
          description: "Title or description of what they want"
        },
        description: {
          type: "string",
          description: "Additional details, especially for commissions"
        },
        amount: {
          type: "number",
          description: "Quoted price in GBP (if known)"
        }
      },
      required: ["client_email", "order_type"]
    }
  },
  {
    name: "update_order_status",
    description: "Update the status of an existing order. Use this when an order progresses through stages (quoted, accepted, paid, shipped, etc.)",
    input_schema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to update"
        },
        status: {
          type: "string",
          enum: ["inquiry", "quoted", "accepted", "paid", "in_progress", "shipped", "completed", "cancelled"],
          description: "The new status for the order"
        },
        notes: {
          type: "string",
          description: "Optional notes about the status change"
        }
      },
      required: ["order_id", "status"]
    }
  },
  {
    name: "get_client_orders",
    description: "Retrieve all orders for a specific client. Use this to check a client's order history or current orders.",
    input_schema: {
      type: "object",
      properties: {
        client_email: {
          type: "string",
          description: "The client's email address"
        }
      },
      required: ["client_email"]
    }
  },
  {
    name: "send_email",
    description: "Send a professional email to a client. Use for sending quotes, order confirmations, shipping notifications, or follow-ups. The email will be sent from Daamitha's gallery email.",
    input_schema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address"
        },
        subject: {
          type: "string",
          description: "Email subject line"
        },
        body: {
          type: "string",
          description: "Email body content (can include basic formatting)"
        },
        template: {
          type: "string",
          enum: ["quote", "order_confirmation", "shipping", "follow_up", "thank_you", "custom"],
          description: "Email template type for consistent branding"
        },
        order_id: {
          type: "string",
          description: "Associated order ID (optional, for tracking)"
        }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "create_payment_link",
    description: "Generate a Polar payment link for a client to pay for an order. Use this when a client has accepted a quote and is ready to pay.",
    input_schema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "The order ID this payment is for"
        },
        amount: {
          type: "number",
          description: "Payment amount in GBP"
        },
        description: {
          type: "string",
          description: "Description of what they're paying for (e.g., artwork title)"
        },
        client_email: {
          type: "string",
          description: "Client's email for the checkout"
        }
      },
      required: ["order_id", "amount", "client_email"]
    }
  },
  {
    name: "check_payment_status",
    description: "Check the payment status of an order or invoice. Use this to verify if a payment has been completed.",
    input_schema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to check payment status for"
        }
      },
      required: ["order_id"]
    }
  },
  {
    name: "save_conversation_context",
    description: "Save important context from the conversation for future reference. Use this when a client shares important preferences, requirements, or details that should be remembered.",
    input_schema: {
      type: "object",
      properties: {
        client_email: {
          type: "string",
          description: "Client's email to associate the context with"
        },
        context: {
          type: "string",
          description: "Important context to save (preferences, requirements, etc.)"
        },
        summary: {
          type: "string",
          description: "Brief summary of the conversation"
        }
      },
      required: ["context"]
    }
  }
];

module.exports = { GALLERY_TOOLS };
