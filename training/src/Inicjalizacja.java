class Rodzic {
    static { System.out.print("1"); }
    { System.out.print("2"); }
    Rodzic() { System.out.print("3"); }
}

class Dziecko extends Rodzic {
    static { System.out.print("4"); }
    { System.out.print("5"); }
    Dziecko() { System.out.print("6"); }
}

public class Inicjalizacja {
    public static void main(String[] args) {
        new Dziecko();
    }
}