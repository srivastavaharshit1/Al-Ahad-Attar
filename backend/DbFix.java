import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DbFix {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
        String user = "postgres.mmcdlumxdrbvomtyiaer";
        String password = "Harsh@9506)!";
        
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Dropping old check constraint...");
            try {
                stmt.execute("ALTER TABLE product_variant DROP CONSTRAINT IF EXISTS product_variant_product_type_check");
                System.out.println("Old constraint dropped.");
            } catch (Exception e) {
                System.out.println("Could not drop constraint: " + e.getMessage());
            }
            
            System.out.println("Done!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
