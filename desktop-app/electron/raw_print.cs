using System;
using System.IO;
using System.Runtime.InteropServices;

namespace GamesUP {
    class Program {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public class DOCINFOW {
            [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
        }

        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOW di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        static int Main(string[] args) {
            if (args.Length < 2) {
                Console.Error.WriteLine("Usage: raw_print.exe <printerName> <filePath>");
                return 1;
            }

            string printerName = args[0];
            string filePath = args[1];

            byte[] bytes;
            try {
                if (filePath == "-") {
                    using (MemoryStream ms = new MemoryStream()) {
                        using (Stream s = Console.OpenStandardInput()) {
                            s.CopyTo(ms);
                        }
                        bytes = ms.ToArray();
                    }
                } else {
                    if (!File.Exists(filePath)) {
                        Console.Error.WriteLine("File not found: " + filePath);
                        return 2;
                    }
                    bytes = File.ReadAllBytes(filePath);
                }
            } catch (Exception ex) {
                Console.Error.WriteLine("Read error: " + ex.Message);
                return 6;
            }

            IntPtr hPrinter;
            if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
                int err = Marshal.GetLastWin32Error();
                Console.Error.WriteLine("OpenPrinter failed with error: " + err);
                return 3;
            }

            DOCINFOW di = new DOCINFOW();
            di.pDocName = "GamesUP Receipt";
            di.pDataType = "RAW";

            if (!StartDocPrinter(hPrinter, 1, di)) {
                ClosePrinter(hPrinter);
                Console.Error.WriteLine("StartDocPrinter failed");
                return 4;
            }

            StartPagePrinter(hPrinter);

            IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
            Marshal.Copy(bytes, 0, pBytes, bytes.Length);

            int dwWritten = 0;
            bool ok = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
            Marshal.FreeCoTaskMem(pBytes);

            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);

            if (ok && dwWritten == bytes.Length) {
                Console.WriteLine("SUCCESS");
                return 0;
            } else {
                Console.Error.WriteLine("WritePrinter incomplete: written " + dwWritten + " of " + bytes.Length);
                return 5;
            }
        }
    }
}
