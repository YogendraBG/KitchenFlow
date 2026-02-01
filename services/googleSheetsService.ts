import { PantryItem, Recipe, DayPlan, UserPreferences } from "../types";

declare var gapi: any;
declare var google: any;

// NOTE: Replace this with your actual Google Cloud Console Client ID
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const SHEET_NAME = 'KitchenFlow Data';

export interface AppData {
  pantry: PantryItem[];
  schedule: Record<string, DayPlan>;
  favorites: Recipe[];
  preferences: UserPreferences;
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let spreadsheetId: string | null = localStorage.getItem('kitchenflow_spreadsheet_id');

export const initGoogleClient = (onInitComplete: (isSignedIn: boolean) => void) => {
  if (!CLIENT_ID || CLIENT_ID.includes('YOUR_CLIENT_ID')) {
      console.warn("Google Client ID not configured.");
      return;
  }

  gapi.load('client', async () => {
    await gapi.client.init({
      // apiKey: API_KEY, // Optional for this flow if using purely OAuth token
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    });
    gapiInited = true;
    checkAuth();
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (resp: any) => {
      if (resp.error !== undefined) {
        throw (resp);
      }
      onInitComplete(true);
      // Save spreadsheet ID if we create/find it later
    },
  });
  gisInited = true;

  const checkAuth = () => {
      // Simple check if we have a valid token (rough check)
      if (gapi.client.getToken()) {
          onInitComplete(true);
      } else {
          onInitComplete(false);
      }
  };
};

export const signIn = () => {
  if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
  }
};

export const signOut = () => {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken('');
      localStorage.removeItem('kitchenflow_spreadsheet_id');
      spreadsheetId = null;
    });
  }
};

const findOrCreateSpreadsheet = async (): Promise<string> => {
    if (spreadsheetId) return spreadsheetId;

    // 1. Search for existing file
    try {
        // We use the Drive API via the GAPI client (requires drive.readonly or drive.file discovery doc if we want to search strictly, 
        // but often we can just try to open if we saved ID. Since we didn't load Drive API discovery, we might need to lazy load it or rely on Sheets API errors)
        // For simplicity in this lightweight implementation, we will create a NEW one if we don't have the ID locally.
        // A more robust app would search Drive.
        
        // Let's create a new one for now to ensure permissions are correct (drive.file scope only allows accessing files created by the app)
        const response = await gapi.client.sheets.spreadsheets.create({
            resource: {
                properties: { title: SHEET_NAME },
                sheets: [
                    { properties: { title: 'Pantry' } },
                    { properties: { title: 'AppData' } }
                ]
            }
        });

        spreadsheetId = response.result.spreadsheetId;
        localStorage.setItem('kitchenflow_spreadsheet_id', spreadsheetId!);
        
        // Add headers to Pantry
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Pantry!A1:D1',
            valueInputOption: 'RAW',
            resource: { values: [['ID', 'Name', 'Quantity', 'Expiration Date']] }
        });

        return spreadsheetId!;
    } catch (e) {
        console.error("Error creating spreadsheet", e);
        throw e;
    }
};

export const syncToSheets = async (data: AppData) => {
    if (!gapiInited) return;

    try {
        const id = await findOrCreateSpreadsheet();

        // 1. Sync Pantry (Rows)
        const pantryRows = data.pantry.map(item => [item.id, item.name, item.quantity, item.expirationDate]);
        
        // Clear old pantry data first (simple approach)
        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: id,
            range: 'Pantry!A2:D1000'
        });

        if (pantryRows.length > 0) {
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: id,
                range: 'Pantry!A2',
                valueInputOption: 'RAW',
                resource: { values: pantryRows }
            });
        }

        // 2. Sync AppData (JSON blobs for complex objects)
        // Row 1: Key, Value
        // Row 2: Schedule, JSON
        // Row 3: Favorites, JSON
        // Row 4: Preferences, JSON
        
        const appDataRows = [
            ['KEY', 'VALUE_JSON'],
            ['SCHEDULE', JSON.stringify(data.schedule)],
            ['FAVORITES', JSON.stringify(data.favorites)],
            ['PREFERENCES', JSON.stringify(data.preferences)]
        ];

        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: id,
            range: 'AppData!A1',
            valueInputOption: 'RAW',
            resource: { values: appDataRows }
        });

        console.log("Synced to Sheets successfully");

    } catch (e) {
        console.error("Sync failed", e);
        // If 404, maybe clear local ID and retry?
        if ((e as any).status === 404) {
            localStorage.removeItem('kitchenflow_spreadsheet_id');
            spreadsheetId = null;
        }
    }
};

export const loadFromSheets = async (): Promise<Partial<AppData> | null> => {
    if (!gapiInited || !spreadsheetId) return null;

    try {
        // Read Pantry
        const pantryRes = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Pantry!A2:D1000',
        });
        
        const pantryItems: PantryItem[] = (pantryRes.result.values || []).map((row: any[]) => ({
            id: row[0],
            name: row[1],
            quantity: row[2],
            expirationDate: row[3]
        }));

        // Read AppData
        const dataRes = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'AppData!A2:B4',
        });
        
        const rows = dataRes.result.values || [];
        const result: Partial<AppData> = { pantry: pantryItems };

        rows.forEach((row: string[]) => {
            try {
                if (row[0] === 'SCHEDULE') result.schedule = JSON.parse(row[1]);
                if (row[0] === 'FAVORITES') result.favorites = JSON.parse(row[1]);
                if (row[0] === 'PREFERENCES') result.preferences = JSON.parse(row[1]);
            } catch (err) {
                console.error("Error parsing JSON from sheet", err);
            }
        });

        return result;

    } catch (e) {
        console.error("Load failed", e);
        return null;
    }
};