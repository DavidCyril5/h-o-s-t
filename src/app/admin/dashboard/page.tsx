"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel as RHFFormLabel, FormMessage, FormDescription } from "@/components/ui/form"; 
import { Label } from "@/components/ui/label"; 
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"; // Import z directly
import { PlatformApiKeySchema, type PlatformApiKeyInput } from "@/lib/schemas"; 
import type { MaintenanceSettings } from "@/lib/types";
import { getActivePlatformApiKey, updatePlatformApiKey, getAllUsersForAdmin, getAllPlatformApiKeys, getPlatformStats, getMaintenanceModeSettings, updateMaintenanceModeSettings, banUser, unbanUser } from "@/lib/actions/admin";
import { redeployAllDeployments } from "@/lib/actions/redeploy";
import { getLoggedInUser, type LoggedInUser } from "@/lib/actions/auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Shield, KeyRound, Users, FileText, Loader2, Eye, EyeOff, RefreshCcw, Edit, Search, AlertTriangle, Settings, Activity, Server, Hammer, UserX, Save, CloudCog } from "lucide-react"; // Added UserX and Hammer
import type { User, PlatformApiKey, PlatformStats, Deployment } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { AdminVerifyPasswordDialog } from "@/components/auth/AdminVerifyPasswordDialog";
import { BanUserDialog } from "@/components/admin/BanUserDialog";
import { useRouter } from 'next/navigation';
import { StatCard } from "@/components/admin/StatCard";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import AdBanner from '@/components/AdBanner';
import { getDeployments } from "@/lib/actions/deployment";


const NEXT_PUBLIC_ADMIN_EMAIL_FROM_ENV = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'ogdavidcyril@gmail.com'; 

const MaintenanceSettingsSchema = z.object({
  isActive: z.boolean(),
  message: z.string().min(1, "Maintenance message cannot be empty if mode is active.").max(500, "Message too long."),
});
type MaintenanceSettingsFormInput = z.infer<typeof MaintenanceSettingsSchema>;


export default function AdminDashboardPage() {
  const { toast } = useToast();
  const router = useRouter(); 

  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true); 

  const [currentApiKeyDisplay, setCurrentApiKeyDisplay] = useState("");
  const [allApiKeys, setAllApiKeys] = useState<PlatformApiKey[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false);
  const [isRedeploying, setIsRedeploying] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(true);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [isBanUserDialogOpen, setIsBanUserDialogOpen] = useState(false);
  
  const [quickStats, setQuickStats] = useState<Partial<PlatformStats> | null>(null);
  const [isLoadingQuickStats, setIsLoadingQuickStats] = useState(true);
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false);
  
  const apiKeyForm = useForm<PlatformApiKeyInput>({
    resolver: zodResolver(PlatformApiKeySchema),
    defaultValues: { apiKey: "" },
  });
  
  const maintenanceForm = useForm<MaintenanceSettingsFormInput>({
    resolver: zodResolver(MaintenanceSettingsSchema),
    defaultValues: {
      isActive: false,
      message: "Our site is currently undergoing scheduled maintenance. We'll be back shortly!",
    },
  });


  const fetchAndDisplayActiveApiKey = useCallback(async () => {
    setIsLoadingApiKey(true);
    try {
      const activeKeyDoc = await getActivePlatformApiKey();
      if (activeKeyDoc && activeKeyDoc.key) {
        setCurrentApiKeyDisplay(activeKeyDoc.key);
      } else {
        setCurrentApiKeyDisplay(""); 
      }
      const allKeys = await getAllPlatformApiKeys();
      setAllApiKeys(allKeys);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load API key information.", variant: "destructive" });
    } finally {
      setIsLoadingApiKey(false);
    }
  }, [toast]);

  const fetchAllUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const usersResult = await getAllUsersForAdmin();
      if (usersResult.success && usersResult.users) {
        setUsers(usersResult.users);
      } else if (!usersResult.success && usersResult.message) {
          toast({ title: "Error", description: `Failed to load users: ${usersResult.message}`, variant: "destructive" });
      }
    } catch (error) {
        toast({ title: "Error", description: "Failed to load users.", variant: "destructive" });
    } finally {
        setIsLoadingUsers(false);
    }
  }, [toast]);

  const fetchAllDeployments = useCallback(async () => {
    setIsLoadingDeployments(true);
    try {
      const deploymentResult = await getDeployments();
      setDeployments(deploymentResult);
    } catch (error) {
        toast({ title: "Error", description: "Failed to load deployments.", variant: "destructive" });
    } finally {
        setIsLoadingDeployments(false);
    }
  }, [toast]);
  
  const fetchQuickStats = useCallback(async () => {
    setIsLoadingQuickStats(true);
    try {
      const statsResult = await getPlatformStats();
      if (statsResult.success && statsResult.stats) {
        setQuickStats(statsResult.stats);
      } else {
        toast({ title: "Error", description: "Failed to load quick stats.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load quick stats.", variant: "destructive" });
    } finally {
      setIsLoadingQuickStats(false);
    }
  }, [toast]);

  const fetchMaintenanceSettings = useCallback(async () => {
    try {
      const settings = await getMaintenanceModeSettings();
      maintenanceForm.reset(settings);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load maintenance settings.", variant: "destructive" });
    }
  }, [maintenanceForm, toast]);


  const handleRefreshUsers = async () => {
    setIsRefreshingUsers(true);
    await fetchAllUsers();
    setIsRefreshingUsers(false);
  };

  useEffect(() => {
    async function initialLoad() {
        setIsLoadingPage(true);
        const user = await getLoggedInUser();
        setCurrentUser(user);

        if (user && user.email.toLowerCase() === NEXT_PUBLIC_ADMIN_EMAIL_FROM_ENV.toLowerCase()) {
            const sessionVerified = typeof window !== 'undefined' && sessionStorage.getItem('adminSessionVerified') === 'true';
            if (sessionVerified) {
                setIsSessionVerified(true);
                setShowVerifyDialog(false);
                fetchAndDisplayActiveApiKey();
                fetchAllUsers();
                fetchQuickStats();
                fetchMaintenanceSettings();
                fetchAllDeployments();
            } else {
                setIsSessionVerified(false);
                setShowVerifyDialog(true);
            }
        } else if (user && user.role === 'admin') { 
            setIsSessionVerified(true); 
            setShowVerifyDialog(false);
            fetchAndDisplayActiveApiKey();
            fetchAllUsers();
            fetchQuickStats();
            fetchMaintenanceSettings();
            fetchAllDeployments();
        } else if (!user) {
            router.push('/admin/login');
        } else { 
            router.push('/dashboard');
        }
        setIsLoadingPage(false);
    }
    initialLoad();
  }, [fetchAndDisplayActiveApiKey, fetchAllUsers, fetchQuickStats, router, fetchMaintenanceSettings, fetchAllDeployments]);


  const handleSessionVerificationSuccess = () => {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('adminSessionVerified', 'true');
    }
    setIsSessionVerified(true);
    setShowVerifyDialog(false);
    fetchAndDisplayActiveApiKey();
    fetchAllUsers();
    fetchQuickStats();
    fetchMaintenanceSettings();
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return users.filter(userItem => 
      userItem.name.toLowerCase().includes(lowercasedSearchTerm) ||
      userItem.email.toLowerCase().includes(lowercasedSearchTerm) ||
      (userItem.isBanned && "banned".includes(lowercasedSearchTerm))
    );
  }, [users, searchTerm]);

  async function onApiKeySubmit(values: PlatformApiKeyInput) {
    setIsUpdatingApiKey(true);
    try {
      const result = await updatePlatformApiKey(values); 
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        apiKeyForm.reset({ apiKey: "" }); 
        fetchAndDisplayActiveApiKey(); 
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsUpdatingApiKey(false);
    }
  }

  async function onMaintenanceSubmit(values: MaintenanceSettingsFormInput) {
    setIsUpdatingMaintenance(true);
    try {
        const result = await updateMaintenanceModeSettings(values);
        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
        if (result.success) {
            fetchMaintenanceSettings(); // Re-fetch to confirm
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to update maintenance settings.", variant: "destructive" });
    } finally {
        setIsUpdatingMaintenance(false);
    }
}


  const handleOpenEditUserDialog = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setIsEditUserDialogOpen(true);
  };

  const handleOpenBanUserDialog = (userToBan: User) => {
    setUserToBan(userToBan);
    setIsBanUserDialogOpen(true);
  };

  const handleUnbanUser = async (userId: string) => {
    const result = await unbanUser(userId);
    toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
    });
    if (result.success) {
        handleUserUpdateSuccess();
    }
  };

  const handleUserUpdateSuccess = () => {
    setIsEditUserDialogOpen(false);
    setSelectedUser(null);
    fetchAllUsers(); 
    fetchQuickStats(); // User changes might affect stats
  };
  
  const handleRedeployAll = async () => {
    setIsRedeploying(true);
    toast({
      title: "Starting Global Redeployment",
      description: "This may take a few minutes. Please do not navigate away from this page.",
    });
    try {
      const result = await redeployAllDeployments();
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred during redeployment.", variant: "destructive" });
    } finally {
      setIsRedeploying(false);
    }
  };

  if (isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground">Admin access required. Redirecting to login...</p>
        </div>
    );
  }
  if (currentUser.role !== 'admin') {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground">Unauthorized access. Redirecting...</p>
        </div>
    );
  }

  if (currentUser.email.toLowerCase() === NEXT_PUBLIC_ADMIN_EMAIL_FROM_ENV.toLowerCase() && showVerifyDialog) {
      return (
          <AdminVerifyPasswordDialog
            isOpen={showVerifyDialog}
            onOpenChange={(open) => {
                setShowVerifyDialog(open);
                if (!open && !isSessionVerified) {
                    console.log("Admin verification dialog closed without success.");
                }
            }}
            onSuccess={handleSessionVerificationSuccess}
          />
      );
  }
  
  if (currentUser.email.toLowerCase() === NEXT_PUBLIC_ADMIN_EMAIL_FROM_ENV.toLowerCase() && !isSessionVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Admin session requires re-verification.</p>
        <Button onClick={() => setShowVerifyDialog(true)} className="mt-4">Re-verify Session</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Shield className="mr-3 h-8 w-8 text-primary" /> Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome, {currentUser.name}.</p>
        </div>
      </div>

      <AdBanner />

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Activity className="mr-2 h-5 w-5 text-primary"/>System Overview</CardTitle>
          <CardDescription className="text-xs">Quick snapshot of key platform metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingQuickStats ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading stats...</span>
            </div>
          ) : quickStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={quickStats.totalUsers ?? 'N/A'} icon={Users} />
              <StatCard title="Total Deployments" value={quickStats.totalDeployments ?? 'N/A'} icon={Server} />
              <StatCard title="Active API Keys" value={allApiKeys.filter(k=>k.isActive).length} icon={KeyRound} />
              <StatCard title="Banned Users" value={quickStats.totalBannedUsers ?? 'N/A'} icon={UserX} />
            </div>
          ) : (
            <p className="text-muted-foreground">Could not load system overview statistics.</p>
          )}
        </CardContent>
      </Card>

       <Card className="shadow-xl hover:shadow-2xl border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-destructive"><CloudCog className="mr-2 h-5 w-5"/>Global Deployment Actions</CardTitle>
          <CardDescription className="text-xs">Trigger actions that affect all deployments on the platform. Use with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
            <div>
              <h3 className="font-semibold">Redeploy All Deployments</h3>
              <p className="text-sm text-muted-foreground">This will trigger a new build and release for every single deployment. <br/>This is a heavy operation and should only be used when a critical update to the underlying source is required.</p>
            </div>
            <Button variant="destructive" onClick={handleRedeployAll} disabled={isRedeploying}>
              {isRedeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCcw className="mr-2 h-4 w-4"/>}
              {isRedeploying ? "Redeploying..." : "Redeploy All"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/>Platform API Key Management</CardTitle>
          <CardDescription className="text-xs">
            Enter a new API key below to make it the active key for new deployments.
            Previous keys will be deactivated but retained for existing deployments.
            Currently, there {allApiKeys.length === 1 ? "is 1 API key" : `are ${allApiKeys.length} API keys`} in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingApiKey ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading API Key info...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {currentApiKeyDisplay && (
                <div className="space-y-1">
                  <Label htmlFor="currentApiKeyDisplay">Current Active API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="currentApiKeyDisplay" 
                      type={showApiKey ? "text" : "password"}
                      value={currentApiKeyDisplay}
                      readOnly
                      className="bg-muted"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)} aria-label={showApiKey ? "Hide API key" : "Show API key"}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                   <p className="text-xs text-muted-foreground">This is the API key currently used for new deployments.</p>
                </div>
              )}
              <Form {...apiKeyForm}>
                <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-4 border-t pt-4 mt-4">
                  <FormField
                    control={apiKeyForm.control}
                    name="apiKey" 
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Set New Active API Key</RHFFormLabel> 
                        <FormControl>
                          <Input type="password" placeholder="Enter new Heroku API Key" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Submit a new key to make it active. The old active key will be deactivated.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdatingApiKey}>
                    {isUpdatingApiKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update and Set Active API Key
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle id="deployments" className="text-lg flex items-center"><Server className="mr-2 h-5 w-5 text-primary"/>All Deployments</CardTitle>
                <CardDescription className="text-xs">View and manage all user deployments. Currently showing {deployments.length} deployment(s).</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDeployments ? (
             <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading deployments...</span>
            </div>
          ) : deployments.length > 0 ? (
            <ScrollArea className="h-[400px] w-full rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>App Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((deployment) => (
                    <TableRow key={deployment.id}>
                      <TableCell className="font-medium">{deployment.appName}</TableCell>
                      <TableCell><Badge variant={deployment.status === 'succeeded' ? 'default' : deployment.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">{deployment.status}</Badge></TableCell>
                      <TableCell>{users.find(user => user._id === deployment.userId)?.email || 'N/A'}</TableCell>
                      <TableCell>{new Date(deployment.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4">No deployments found.</p>
          )}
        </CardContent>
      </Card>


      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle id="users" className="text-lg flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>User Management</CardTitle>
                <CardDescription className="text-xs">View and manage user accounts. Currently showing {filteredUsers.length} of {users.length} user(s).</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search name, email, or 'banned'..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full sm:w-[200px] lg:w-[250px]"
                  />
              </div>
              <Button variant="outline" size="sm" onClick={handleRefreshUsers} disabled={isRefreshingUsers || isLoadingUsers} className="flex-shrink-0">
                  {isRefreshingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCcw className="mr-2 h-4 w-4"/>}
                  Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
             <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <ScrollArea className="h-[400px] w-full rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Coins</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userItem) => ( 
                    <TableRow key={userItem._id} className={userItem.isBanned ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                      <TableCell className="font-medium">{userItem.name}</TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell><Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'} className="text-xs">{userItem.role}</Badge></TableCell>
                      <TableCell className="text-right">{userItem.coins?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        {userItem.isBanned ? (
                            <Badge variant="destructive" className="text-xs flex items-center">
                                <AlertTriangle className="mr-1 h-3 w-3"/> Banned
                            </Badge>
                        ): (
                            <Badge variant="outline" className="text-xs">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>{userItem.referralCode || 'N/A'}</TableCell>
                      <TableCell>{new Date(userItem.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center"> 
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditUserDialog(userItem)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        {userItem.isBanned ? (
                          <Button variant="ghost" size="sm" onClick={() => handleUnbanUser(userItem._id)}>
                            <Hammer className="mr-2 h-4 w-4" /> Unban
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenBanUserDialog(userItem)}>
                            <UserX className="mr-2 h-4 w-4" /> Ban
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4">{searchTerm ? "No users match your search." : "No users found."}</p>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <EditUserDialog
          user={selectedUser}
          isOpen={isEditUserDialogOpen}
          onOpenChange={setIsEditUserDialogOpen}
          onSuccess={handleUserUpdateSuccess}
        />
      )}

      {userToBan && (
        <BanUserDialog
          userId={userToBan._id}
          userEmail={userToBan.email}
          isOpen={isBanUserDialogOpen}
          onOpenChange={setIsBanUserDialogOpen}
          onSuccess={handleUserUpdateSuccess}
        />
      )}

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><Settings className="mr-2 h-5 w-5 text-primary"/>Platform Settings</CardTitle>
          <CardDescription className="text-xs">General settings for the platform.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...maintenanceForm}>
                <form onSubmit={maintenanceForm.handleSubmit(onMaintenanceSubmit)} className="space-y-6 p-4 border rounded-md">
                    <FormField
                        control={maintenanceForm.control}
                        name="isActive"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <RHFFormLabel className="text-base">Maintenance Mode</RHFFormLabel>
                                    <FormDescription>
                                        If active, non-admin users will be redirected to a maintenance page.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={maintenanceForm.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <RHFFormLabel>Maintenance Message</RHFFormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Enter message to display to users during maintenance..."
                                        rows={3}
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>This message will be shown on the maintenance page.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isUpdatingMaintenance}>
                        {isUpdatingMaintenance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Maintenance Settings
                    </Button>
                </form>
            </Form>
          {/* Other general settings could go here */}
        </CardContent>
      </Card>

      <Card className="shadow-xl hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Application Logs</CardTitle>
          <CardDescription className="text-xs">View system-wide application logs (feature coming soon).</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A centralized place to view important system logs and errors will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
