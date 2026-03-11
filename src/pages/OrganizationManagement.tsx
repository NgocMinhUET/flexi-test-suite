import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations, useCreateOrganization, useDeleteOrganization, useUpdateOrganization } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react';
import type { Organization } from '@/types/registration';

export default function OrganizationManagement() {
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  const { data: organizations, isLoading } = useOrganizations();
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const deleteOrg = useDeleteOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [formData, setFormData] = useState({
    name: '', code: '', description: '', contact_email: '', contact_phone: '', address: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isTeacher))) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, isTeacher, navigate]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const openCreate = () => {
    setEditingOrg(null);
    setFormData({ name: '', code: '', description: '', contact_email: '', contact_phone: '', address: '' });
    setDialogOpen(true);
  };

  const openEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      code: org.code,
      description: org.description || '',
      contact_email: org.contact_email || '',
      contact_phone: org.contact_phone || '',
      address: org.address || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) return;
    if (editingOrg) {
      await updateOrg.mutateAsync({ id: editingOrg.id, data: formData });
    } else {
      await createOrg.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (selectedOrg) {
      await deleteOrg.mutateAsync(selectedOrg.id);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Quản lý Đơn vị</h1>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm đơn vị
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách đơn vị (Trường / Trung tâm)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : organizations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có đơn vị nào. Nhấn "Thêm đơn vị" để bắt đầu.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên đơn vị</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations?.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="font-mono text-sm">{org.code}</TableCell>
                      <TableCell>{org.contact_email || '-'}</TableCell>
                      <TableCell>{org.contact_phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(org)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedOrg(org); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Sửa đơn vị' : 'Thêm đơn vị mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên đơn vị *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="VD: ĐH Quốc Gia Hà Nội" />
              </div>
              <div className="space-y-2">
                <Label>Mã đơn vị *</Label>
                <Input value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="VD: DHQGHN" disabled={!!editingOrg} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email liên hệ</Label>
                <Input type="email" value={formData.contact_email} onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Điện thoại</Label>
                <Input value={formData.contact_phone} onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Địa chỉ</Label>
              <Input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.code || createOrg.isPending || updateOrg.isPending}>
              {editingOrg ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa đơn vị "{selectedOrg?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
