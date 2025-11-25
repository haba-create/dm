/**
 * Claude Agent Tools
 *
 * These tools give Claude the ability to take actions in the gallery system:
 * - Look up and manage clients (CRM)
 * - Create and manage orders
 * - Send emails and notifications via Gmail
 * - Create payment links
 * - Get artwork information
 * - Schedule follow-ups and reminders
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
    name: "update_client",
    description: "Update a client's profile information including notes, tags, phone, address, and company. Use this to add notes about client preferences or after meaningful interactions.",
    input_schema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "The client's email address"
        },
        name: {
          type: "string",
          description: "Client's full name"
        },
        phone: {
          type: "string",
          description: "Client's phone number"
        },
        address: {
          type: "string",
          description: "Client's shipping address"
        },
        company: {
          type: "string",
          description: "Client's company or organization"
        },
        notes: {
          type: "string",
          description: "Notes about the client (preferences, special requirements, etc.)"
        },
        tags: {
          type: "string",
          description: "Comma-separated tags for categorizing the client (e.g., 'VIP,collector,commission')"
        }
      },
      required: ["email"]
    }
  },
  {
    name: "search_clients",
    description: "Search for clients by name, email, company, or tags. Use this to find clients matching certain criteria.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (matches name, email, or company)"
        },
        tag: {
          type: "string",
          description: "Filter by tag"
        },
        limit: {
          type: "integer",
          description: "Maximum number of results (default 10)"
        }
      }
    }
  },
  {
    name: "create_contact",
    description: "Create a new contact/lead in the CRM system when someone expresses interest but hasn't made an order yet. Use this to track potential clients.",
    input_schema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Contact's email address"
        },
        name: {
          type: "string",
          description: "Contact's full name"
        },
        phone: {
          type: "string",
          description: "Contact's phone number (optional)"
        },
        source: {
          type: "string",
          description: "How they found the gallery (e.g., 'website chat', 'instagram', 'referral')"
        },
        notes: {
          type: "string",
          description: "Initial notes about the contact"
        },
        tags: {
          type: "string",
          description: "Initial tags (e.g., 'lead,interested-in-commissions')"
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
  },

  // ============================================
  // GMAIL NOTIFICATION TOOLS
  // ============================================

  {
    name: "send_notification",
    description: "Send a notification email to Daamitha (the gallery owner) about important events like new inquiries, orders, or urgent client matters. Use this to keep Daamitha informed.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["new_inquiry", "new_order", "payment_received", "urgent", "follow_up_needed", "custom"],
          description: "Type of notification"
        },
        subject: {
          type: "string",
          description: "Custom subject line (required for 'custom' type)"
        },
        summary: {
          type: "string",
          description: "Brief summary of what happened"
        },
        client_email: {
          type: "string",
          description: "Related client's email"
        },
        client_name: {
          type: "string",
          description: "Related client's name"
        },
        order_id: {
          type: "string",
          description: "Related order ID (if applicable)"
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "Priority level (default: normal)"
        }
      },
      required: ["type", "summary"]
    }
  },
  {
    name: "send_quote_email",
    description: "Send a professional quote email to a client with artwork details and payment link. Use after discussing pricing with a client.",
    input_schema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Client's email address"
        },
        client_name: {
          type: "string",
          description: "Client's name"
        },
        artwork_title: {
          type: "string",
          description: "Title of the artwork"
        },
        amount: {
          type: "number",
          description: "Quote amount in GBP"
        },
        description: {
          type: "string",
          description: "Additional details about the quote"
        },
        include_payment_link: {
          type: "boolean",
          description: "Whether to generate and include a payment link"
        },
        order_id: {
          type: "string",
          description: "Associated order ID"
        }
      },
      required: ["to", "client_name", "artwork_title", "amount"]
    }
  },
  {
    name: "send_order_update",
    description: "Send an order status update email to a client. Use when an order status changes (e.g., shipped, completed).",
    input_schema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Client's email address"
        },
        client_name: {
          type: "string",
          description: "Client's name"
        },
        order_id: {
          type: "string",
          description: "Order ID"
        },
        new_status: {
          type: "string",
          enum: ["accepted", "paid", "in_progress", "shipped", "completed"],
          description: "The new order status"
        },
        tracking_number: {
          type: "string",
          description: "Shipping tracking number (for shipped status)"
        },
        carrier: {
          type: "string",
          description: "Shipping carrier (e.g., Royal Mail, DHL)"
        },
        additional_message: {
          type: "string",
          description: "Additional personalized message"
        }
      },
      required: ["to", "client_name", "order_id", "new_status"]
    }
  },
  {
    name: "send_follow_up",
    description: "Send a follow-up email to a client. Use to check in on clients who haven't responded or to maintain relationships.",
    input_schema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Client's email address"
        },
        client_name: {
          type: "string",
          description: "Client's name"
        },
        subject: {
          type: "string",
          description: "Email subject line"
        },
        message: {
          type: "string",
          description: "The follow-up message content"
        },
        context: {
          type: "string",
          description: "Context for the follow-up (e.g., 'quote sent 1 week ago', 'showed interest in commissions')"
        }
      },
      required: ["to", "client_name", "message"]
    }
  },

  // ============================================
  // CRM ACTIVITY TOOLS
  // ============================================

  {
    name: "log_activity",
    description: "Log an activity or interaction with a client for CRM tracking. Use this to record calls, meetings, or important communications.",
    input_schema: {
      type: "object",
      properties: {
        client_email: {
          type: "string",
          description: "Client's email address"
        },
        activity_type: {
          type: "string",
          enum: ["call", "email", "meeting", "chat", "inquiry", "note"],
          description: "Type of activity"
        },
        description: {
          type: "string",
          description: "Description of the activity"
        },
        outcome: {
          type: "string",
          description: "Result or outcome of the activity"
        }
      },
      required: ["client_email", "activity_type", "description"]
    }
  },
  {
    name: "get_crm_summary",
    description: "Get a summary of CRM data including recent orders, contacts needing follow-up, and key statistics. Use this to get an overview of the gallery's client activity.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "Number of days to look back (default 30)"
        },
        include_stats: {
          type: "boolean",
          description: "Include statistics (default true)"
        }
      }
    }
  },
  {
    name: "get_follow_up_list",
    description: "Get a list of clients who need follow-up. Use this to identify clients who haven't been contacted recently or have pending inquiries.",
    input_schema: {
      type: "object",
      properties: {
        days_since_contact: {
          type: "integer",
          description: "Days since last contact (default 14)"
        },
        include_pending_orders: {
          type: "boolean",
          description: "Include clients with pending orders (default true)"
        },
        limit: {
          type: "integer",
          description: "Maximum number of results (default 10)"
        }
      }
    }
  }
];

module.exports = { GALLERY_TOOLS };
