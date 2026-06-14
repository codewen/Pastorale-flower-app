export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string;
          order_id: string;
          customer_id: string;
          details: string | null;
          status: "Ordered" | "Ready" | "Done";
          delivery_date_time: string;
          pickup_delivery: "Pickup" | "Delivery";
          payment_status: "Paid" | "Unpaid" | "Pending";
          price: number | null;
          photos: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          customer_id: string;
          details?: string | null;
          status?: "Ordered" | "Ready" | "Done";
          delivery_date_time: string;
          pickup_delivery: "Pickup" | "Delivery";
          payment_status?: "Paid" | "Unpaid" | "Pending";
          price?: number | null;
          photos?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          customer_id?: string;
          details?: string | null;
          status?: "Ordered" | "Ready" | "Done";
          delivery_date_time?: string;
          pickup_delivery?: "Pickup" | "Delivery";
          payment_status?: "Paid" | "Unpaid" | "Pending";
          price?: number | null;
          photos?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      blackout_dates: {
        Row: {
          id: string;
          date: string;
          disable_pickup: boolean;
          disable_delivery: boolean;
          pickup_start_hour: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          disable_pickup?: boolean;
          disable_delivery?: boolean;
          pickup_start_hour?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          disable_pickup?: boolean;
          disable_delivery?: boolean;
          pickup_start_hour?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
