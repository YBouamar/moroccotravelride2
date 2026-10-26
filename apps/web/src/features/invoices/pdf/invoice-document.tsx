import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

/**
 * Invoice PDF (step 10). The document belongs to the carrier: its legal details are printed,
 * MoroccoTravelRide only appears in the footer. Built-in Helvetica covers French and English;
 * Arabic PDFs need an embedded Arabic font and RTL layout (BACKLOG), the Arabic UI gets French.
 */

export interface PdfParty {
  name: string;
  lines: string[];
}

export interface PdfLine {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  subtotal: string;
}

export interface InvoicePdfData {
  title: string;
  draftWatermark?: string;
  meta: { label: string; value: string }[];
  sellerLabel: string;
  buyerLabel: string;
  seller: PdfParty;
  buyer: PdfParty;
  columns: {
    description: string;
    quantity: string;
    unitPrice: string;
    vatRate: string;
    subtotal: string;
  };
  lines: PdfLine[];
  totals: { label: string; value: string; strong?: boolean }[];
  notes?: string;
  footer: string;
}

const NAVY = '#102A43';
const TEAL_DEEP = '#087E8B';
const BORDER = '#D9E2EC';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: NAVY },
  watermark: {
    position: 'absolute',
    top: 330,
    left: 90,
    fontSize: 72,
    color: '#E4E7EB',
    transform: 'rotate(-30deg)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: TEAL_DEEP },
  meta: { marginTop: 6 },
  parties: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  party: { flex: 1, padding: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  partyLabel: { fontSize: 8, color: TEAL_DEEP, marginBottom: 4, textTransform: 'uppercase' },
  partyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 5,
  },
  head: { backgroundColor: '#F4F8FA', fontFamily: 'Helvetica-Bold' },
  description: { flex: 4, paddingRight: 6 },
  number: { flex: 1, textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  strong: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  notes: { marginTop: 18, color: '#486581' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#829AB1',
    textAlign: 'center',
  },
});

function Party({ label, party }: { label: string; party: PdfParty }) {
  return (
    <View style={styles.party}>
      <Text style={styles.partyLabel}>{label}</Text>
      <Text style={styles.partyName}>{party.name}</Text>
      {party.lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </View>
  );
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document title={data.title} author={data.seller.name}>
      <Page size="A4" style={styles.page}>
        {data.draftWatermark ? (
          <Text style={styles.watermark} fixed>
            {data.draftWatermark}
          </Text>
        ) : null}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{data.title}</Text>
            <View style={styles.meta}>
              {data.meta.map((item) => (
                <Text key={item.label}>
                  {item.label} : {item.value}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.parties}>
          <Party label={data.sellerLabel} party={data.seller} />
          <Party label={data.buyerLabel} party={data.buyer} />
        </View>
        <View style={[styles.row, styles.head]}>
          <Text style={styles.description}>{data.columns.description}</Text>
          <Text style={styles.number}>{data.columns.quantity}</Text>
          <Text style={styles.number}>{data.columns.unitPrice}</Text>
          <Text style={styles.number}>{data.columns.vatRate}</Text>
          <Text style={styles.number}>{data.columns.subtotal}</Text>
        </View>
        {data.lines.map((line, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <Text style={styles.description}>{line.description}</Text>
            <Text style={styles.number}>{line.quantity}</Text>
            <Text style={styles.number}>{line.unitPrice}</Text>
            <Text style={styles.number}>{line.vatRate}</Text>
            <Text style={styles.number}>{line.subtotal}</Text>
          </View>
        ))}
        <View style={styles.totals}>
          {data.totals.map((total) => (
            <View key={total.label} style={styles.totalRow}>
              <Text style={total.strong ? styles.strong : undefined}>{total.label}</Text>
              <Text style={total.strong ? styles.strong : undefined}>{total.value}</Text>
            </View>
          ))}
        </View>
        {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}
        <Text style={styles.footer} fixed>
          {data.footer}
        </Text>
      </Page>
    </Document>
  );
}
