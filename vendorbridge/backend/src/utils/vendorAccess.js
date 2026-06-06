export const getVendorIdForUser = async (supabaseAdmin, userId) => {
  const { data, error } = await supabaseAdmin
    .from('vendor_users')
    .select('vendor_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.vendor_id || null;
};

export const requireVendorIdForUser = async (supabaseAdmin, userId, res) => {
  const vendorId = await getVendorIdForUser(supabaseAdmin, userId);
  if (!vendorId) {
    res.status(403).json({ error: 'No vendor linked to this user' });
    return null;
  }
  return vendorId;
};

export const assertVendorScope = async (supabaseAdmin, req, res, requestedVendorId = null) => {
  if (req.user?.role !== 'vendor') return null;

  const vendorId = await requireVendorIdForUser(supabaseAdmin, req.user.id, res);
  if (!vendorId) return null;

  if (requestedVendorId && requestedVendorId !== vendorId) {
    res.status(403).json({ error: 'You can only access records for your vendor account' });
    return null;
  }

  return vendorId;
};

export const redactRFQForVendor = (rfq, vendorId) => {
  if (!rfq) return rfq;

  return {
    ...rfq,
    rfq_vendors: (rfq.rfq_vendors || [])
      .filter(row => row.vendor_id === vendorId)
      .map(row => ({
        id: row.id,
        rfq_id: row.rfq_id,
        vendor_id: row.vendor_id,
        responded: row.responded,
      })),
  };
};
