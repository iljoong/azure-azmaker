# Test scenario

0. provision service

	check resources in portal (2 rg, 2 storage, 2 svcplan, 2 fx, 2 sch, 2 webapp, 1 tm)  
 
1. open website

	check website
 
2. upload image on primary

	check log

3. failover

	check secondary

4. upload image on secondary

	check log

5. failback

	check primary

6. edit description

	check description

7. failover

	check secondary description
