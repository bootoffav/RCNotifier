export interface IncomingEntity {
  ID: number;
}
export interface Lead extends IncomingEntity {
  SOURCE_ID: "WEBFORM" | string;
}

export interface Activity extends IncomingEntity {
  OWNER_ID: `${number}`;
  OWNER_TYPE_ID: `${number}`;
  RESPONSIBLE_ID: `${number}`;
  PROVIDER_ID: "CRM_WEBFORM" | string;
  PROVIDER_PARAMS: {
    FIELDS: {
      caption:
        | "Name"
        | "Company"
        | "Phone number"
        | "E-mail"
        | "Country"
        | "Request";
      type: "phone" | "string" | "list";
      value: any;
    }[];
    FORM: any;
    VISITED_PAGES: any;
  };
}

export interface WebhookPayload {
  event: "ONTASKUPDATE";
  [k: string]: string;
}
