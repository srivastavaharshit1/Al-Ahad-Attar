import com.razorpay.RazorpayException;
import java.lang.reflect.Method;
public class Test {
    public static void main(String[] args) {
        for (Method m : RazorpayException.class.getDeclaredMethods()) {
            System.out.println(m.getName());
        }
    }
}
